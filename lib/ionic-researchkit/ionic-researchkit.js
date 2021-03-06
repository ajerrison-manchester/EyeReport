/** 
* Author: Nino Guba
* Date: 08-26-2015
* Directives for ResearchKit in Ionic
*
* Adapted from the following:
* ion-slide-box (https://github.com/driftyco/ionic)
* ion-wizard (https://github.com/arielfaur/ionic-wizard)
*
* Required dependencies:
* checklist-model (https://github.com/vitalets/checklist-model)
* signature_pad (https://github.com/szimek/signature_pad)
* angular-dialgauge (https://github.com/cdjackson/angular-dialgauge)
*/
angular.module('ionicResearchKit',[])
//======================================================================================
// This provides a counterpart of Apple's ResearchKit for Ionic apps
// =====================================================================================


//======================================================================================
// Usage: 
// =====================================================================================
.service('irkResults', function() {
    var service = this;
    var results = null;

    service.initResults = function() {
        results = {
            "start": new Date(),
            "end": null,
            "childResults": []
        }
    };

    service.getResults = function() {
        return results;
    }

    service.getAllNoPhotoResults = function () {
        var index = 0;
        var noPhotoResults = results;
        for (index = 0; index < noPhotoResults.childResults.length; index++) {
            if (noPhotoResults.childResults[index].type === "IRK-PHOTO-STEP") {
                noPhotoResults.childResults[index].answer = "[PHOTO DATA]";
            }
        }

        return noPhotoResults;
    }

    service.sumIDResults = function (prefix) {

        if (results == null) {
            return 0;
        }

        var total = 0;
        var index = 0;
        for (index = 0; index < results.childResults.length; index++) {
            if (results.childResults[index].id.indexOf(prefix) == 0 && results.childResults[index].answer != null) {
                total = total + parseInt(results.childResults[index].answer);
            }
        }

        return total;
    }

    service.addResult = function(index, formData) {
        if (!results) service.initResults();

        if (index == results.childResults.length)
        {
            results.childResults.push({
                "index": index,
                "start": new Date(),
                "end": null
            });            
        }
        else
        {
            var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
            var stepId = step.attr('id');
            var stepType = step.prop('tagName');
            var stepValue = formData[stepId];
            var stepUnit = step.attr('unit');
            var consentType = step.attr('type');

            results.childResults[index].id = stepId;
            results.childResults[index].type = stepType;

            if (stepType == 'IRK-CONSENT-REVIEW-STEP' && consentType == 'review')
                results.childResults[index].answer = (angular.isDefined(formData.consent)?formData.consent:null);
            else if (stepType == 'IRK-DATE-QUESTION-STEP')
                results.childResults[index].answer = (stepValue?stepValue.toDateString():null);
            else if (stepType == 'IRK-TIME-QUESTION-STEP')
                results.childResults[index].answer = (stepValue?stepValue.toTimeString():null);
            else if (stepType != 'IRK-INSTRUCTION-STEP' && stepType != 'IRK-COUNTDOWN-STEP' && stepType != 'IRK-COMPLETION-STEP' && stepType != 'IRK-VISUAL-CONSENT-STEP' && !(stepType=='IRK-CONSENT-REVIEW-STEP' && consentType=='signature') && stepType != 'IRK-TWO-FINGER-TAPPING-INTERVAL-TASK')
                results.childResults[index].answer = (stepValue?stepValue:null);
            else if (stepType == 'IRK-TWO-FINGER-TAPPING-INTERVAL-TASK')
                results.childResults[index].samples = (stepValue && stepValue.samples?stepValue.samples:null);

            if (stepType == 'IRK-NUMERIC-QUESTION-STEP')
                results.childResults[index].unit = (stepUnit?stepUnit:null);

            if (stepType == 'IRK-CONSENT-REVIEW-STEP' && consentType == 'signature') {
                results.childResults[index].signature = (angular.isDefined(formData.signature)?formData.signature:null);
                results.childResults[index].date = (angular.isDefined(formData.signature)?(new Date()).toDateString():null);
            }

            if (stepType == 'IRK-PHOTO-STEP') {
                results.childResults[index].photo = (angular.isDefined(formData.photo) ? formData.photo : null);
                
            }

            results.childResults[index].end = new Date();
            results.end = new Date();
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkOrderedTasks', [
    '$rootScope',
    '$timeout',
    '$interval',
    '$compile',
    '$ionicSlideBoxDelegate',
    '$ionicHistory',
    '$ionicScrollDelegate',
    '$ionicNavBarDelegate',
    '$ionicActionSheet',
    '$ionicModal',
    '$ionicPopup',
    '$ionicPlatform',
    'irkResults',
    function($rootScope, $timeout, $interval, $compile, $ionicSlideBoxDelegate, $ionicHistory, $ionicScrollDelegate, $ionicNavBarDelegate, $ionicActionSheet, $ionicModal, $ionicPopup, $ionicPlatform, irkResults) {
        return {
            restrict: 'E',
            replace: true,
            transclude: true,
            scope: {
                autoPlay: '=',
                doesContinue: '@',
                slideInterval: '@',
                showPager: '@',
                pagerClick: '&',
                disableScroll: '@',
                onSlideChanged: '&',
                activeSlide: '=?'
            },
            controller: ['$scope', '$rootScope', '$element', '$attrs', function($scope, $rootScope, $element, $attrs) {
                var _this = this;

                var slider = new ionic.views.Slider({
                    el: $element[0],
                    auto: false,
                    continuous: false,
                    startSlide: $scope.activeSlide,
                    slidesChanged: function() {
                        $scope.currentSlide = slider.currentIndex();

                        // Force a slideChanged event on init
                        $scope.$parent.$broadcast('slideBox.slideChanged', slider.currentIndex(), slider.slidesCount());

                        // Try to trigger a digest
                        $timeout(function() {});
                    },
                    callback: function(slideIndex) {
                        $scope.currentSlide = slideIndex;
                        $scope.onSlideChanged({ index: $scope.currentSlide, $index: $scope.currentSlide});
                        $scope.$parent.$broadcast('slideBox.slideChanged', slideIndex, slider.slidesCount());
                        $scope.activeSlide = slideIndex;

                        // Try to trigger a digest
                        $timeout(function() {});
                    }
                });

                slider.enableSlide(false);

                $scope.$watch('activeSlide', function(nv) {
                    if (angular.isDefined(nv)) {
                        slider.slide(nv);
                    }
                });

                $scope.$on('slideBox.setSlide', function(e, index) {
                    slider.slide(index);
                });

                //Exposed for testing
                this.__slider = slider;

                var deregisterInstance = $ionicSlideBoxDelegate._registerInstance(
                    slider, $attrs.delegateHandle, function() {
                        return $ionicHistory.isActiveScope($scope);
                    }
                );
                
                $scope.$on('$destroy', function() {
                    deregisterInstance();
                    slider.kill();
                    $scope.stopCountdown();
                });

                this.slidesCount = function() {
                    return slider.slidesCount();
                };

                $timeout(function() {
                    slider.load();
                });

                $scope.doStepBack = function() {
                    console.log('Clicked back');
                    slider.prev();
                };

                $scope.doStepNext = function() {
                    console.log('Clicked next');
                    $scope.doNext();
                };

                $scope.doSkip = function() {
                    console.log('Clicked skip');
                    $scope.doNext();
                };

                $scope.doNext = function() {
                    $scope.doSave();

                    if (slider.currentIndex() < slider.slidesCount()-1)
                        slider.next();
                    else
                        $scope.doEnd();
                };

                $scope.enableSlide = function (enable) {
                    slider.enableSlide(enable);
                };

                $scope.doCancel = function() {
                    var index = $scope.currentSlide;
                    var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                    var stepType = step.prop('tagName');

                    if (stepType=='IRK-COMPLETION-STEP' && index==slider.slidesCount()-1)
                    {                    
                        console.log('Clicked done');
                        $scope.doNext();
                    }
                    else
                    {
                        console.log('Clicked cancel');
                        // Show the action sheet
                        var hideSheet = $ionicActionSheet.show({
                            destructiveText: (ionic.Platform.isAndroid()?'<i class="icon ion-android-exit assertive"></i> ':'')+'End Task',
                            cancelText: 'Cancel',
                            cancel: function() {
                                hideSheet();
                            },
                            destructiveButtonClicked: function(index) {
                                console.log('Clicked end task');
                                $scope.doSave();
                                $scope.doEnd();
                                return true;
                            }
                        });
                    }
                };

                $scope.doEnd = function() {
                    $scope.$parent.closeModal();

                    //This is needed to set the Android back button to map back to the step back action
                    $scope.deregisterStepBack();
                    
                    //Just in case we're coming from a countdown step
                    $scope.stopCountdown();                    
                };

                $scope.$on("step:Previous", function() {
                    slider.prev();
                });
                
                $scope.$on("step:Next", function() {
                    $scope.doNext();
                });

                //This is needed to set the Android back button to not close the modal
                $scope.deregisterStepBack = $ionicPlatform.registerBackButtonAction($scope.doStepBack, 250);

                $scope.showLearnMore = function() {
                    var index = $scope.currentSlide;
                    var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-learn-more-content'));
                    var stepContent = step.html();

                    $scope.learnmore = $ionicModal.fromTemplate(
                        '<ion-modal-view class="irk-modal">'+
                        '<ion-header-bar>'+
                        '<h1 class="title">Learn More</h1>'+
                        '<div class="buttons">'+
                        '<button class="button button-clear button-positive" ng-click="hideLearnMore()">Done</button>'+
                        '</div>'+
                        '</ion-header-bar>'+
                        '<ion-content class="padding">'+
                        stepContent+
                        '</ion-content>'+
                        '</ion-modal-view>'
                    ,{
                        scope: $scope,
                        animation: 'slide-in-up'
                    });
                    $scope.learnmore.show();

                    //This is needed to set the Android back button to override the step back action
                    $scope.deregisterHideLearnMore = $ionicPlatform.registerBackButtonAction($scope.hideLearnMore, 250);
                };

                $scope.hideLearnMore = function() {
                    $scope.learnmore.remove();

                    //This is needed to set the Android back button to map back to the step back action
                    $scope.deregisterHideLearnMore();
                };

                $scope.doShare = function(id,choice) {
                    $scope.formData[id] = choice;
                    $scope.doNext();
                };

                $scope.doAgree = function() {
                    var index = $scope.currentSlide;
                    var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                    var stepReason = step.attr('reason-for-consent');

                    var confirmPopup = $ionicPopup.confirm({
                        title: 'Review',
                        template: stepReason,
                        cssClass: 'irk-text-centered irk-popup',
                        cancelText: 'Cancel',
                        cancelType: 'button-outline button-positive',
                        okText: 'Agree',
                        okType: 'button-outline button-positive'
                    });
                    confirmPopup.then(function(res) {
                        if (res) {
                            console.log('Clicked agree');
                            $scope.formData.consent = true;
                            $scope.doNext();
                        } else {
                            console.log('Click cancel');
                        }
                    });
                };

                $scope.doDisagree = function() {
                    console.log('Clicked disagree');
                    $scope.formData.consent = false;
                    $scope.doSave();
                    $scope.doEnd();                    
                };

                //This is called to reanimate GIF images
                $scope.previousIndex = 0;
                $scope.doReanimateConsentImage = function() {
                    var index = slider.currentIndex();
                    var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                    var stepType = step.prop('tagName');

                    if (stepType == 'IRK-VISUAL-CONSENT-STEP' && $scope.previousIndex <= index) {
                        var consentType = step.attr('type');
                        var consentImageClass = '';

                        switch (consentType) {
                            case 'data-gathering':
                                consentImageClass = 'consent_01.gif';
                                break;
                            case 'privacy':
                                consentImageClass = 'consent_02.gif';
                                break;
                            case 'data-use':
                                consentImageClass = 'consent_03.gif';
                                break;
                            case 'time-commitment':
                                consentImageClass = 'consent_04.gif';
                                break;
                            case 'study-survey':
                                consentImageClass = 'consent_05.gif';
                                break;
                            case 'study-tasks':
                                consentImageClass = 'consent_06.gif';
                                break;
                            case 'withdrawing':
                                consentImageClass = 'consent_07.gif';
                                break;
                        }

                        if (consentImageClass != '') {
                            var image = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step-image'));
                            image.css('background-image', 'url(lib/ionic-researchkit/resources/'+consentImageClass+'?x='+Math.random()+')');
                        }
                    }

                    $scope.previousIndex = index;
                }; 

                //This is called when input changes (faster than form.$dirty)
                $scope.dirty = function() {
                    //Enable only when current form is dirtied and valid
                    $timeout(function() {
                        var index = slider.currentIndex();
                        var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                        var stepType = step.prop('tagName');
                        var form = step.find('form');
                        var input = form.find('input');
                        var next = angular.element(document.querySelectorAll('.irk-next-button'));
                        if (form.length > 0  
                            && ((stepType!='IRK-DATE-QUESTION-STEP' && stepType!='IRK-TIME-QUESTION-STEP' && form.hasClass('ng-invalid'))
                                || ((stepType=='IRK-DATE-QUESTION-STEP' || stepType=='IRK-TIME-QUESTION-STEP') && input.hasClass('ng-invalid'))))
                        {
                            angular.element(next[0]).attr("disabled", "disabled");
                            angular.element(next[1]).attr("disabled", "disabled");
                        } 
                        else 
                        {
                            angular.element(next[0]).removeAttr("disabled");
                            angular.element(next[1]).removeAttr("disabled");
                        }
                    }, 100);
                };

                //This is to initialize what will hold the results
                $scope.formData = {};
                irkResults.initResults();

                //This is called to capture the results
                $scope.doSave = function() {
                    irkResults.addResult(slider.currentIndex(), $scope.formData);
                }; 

                $scope.$on("slideBox.slideChanged", function(e, index) {
                    $scope.doSave();
                    $scope.doReanimateConsentImage();
                    $scope.stopCountdown();
                });

                $scope.stopCountdown = function() {
                    var index = slider.currentIndex();
                    var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));

                    if (step!='IRK-COUNTDOWN-STEP' && angular.isDefined($scope.currentCountdown)) {
                        $interval.cancel($scope.currentCountdown);
                        $scope.currentCountdown = undefined;
                    }
                };
            }],

            template:
                '<div class="slider irk-slider">'+
                '<div class="slider-slides irk-slider-slides" ng-transclude>'+
                '</div>'+
                //FOOTER BAR FOR SURVEY STEPS
                '<ion-footer-bar class="irk-bottom-bar" keyboard-attach irk-survey-bar>'+
                '<div>'+
                '<a class="button button-block button-outline button-positive irk-bottom-button" ng-click="doStepNext()" irk-step-next>Next</a>'+
                '<a class="button button-block button-clear button-positive irk-bottom-button" ng-click="doSkip()" irk-step-skip>Skip this question</a>'+
                '</div>'+
                '</ion-footer-bar>'+
                //FOOTER BAR FOR CONSENT STEPS
                '<ion-footer-bar class="irk-bottom-bar irk-bottom-bar-consent" keyboard-attach irk-consent-bar>'+
                '<button class="button button-block button-outline button-positive irk-bottom-button" ng-click="doStepNext()" irk-step-next>Next</button>'+
                '</ion-footer-bar>'+
                //FOOTER BAR FOR CONSENT REVIEW
                '<ion-footer-bar class="irk-bottom-bar irk-bottom-bar-consent-agree bar-stable" irk-consent-bar-agree>'+
                '<div class="buttons">'+
                '<button class="button button-clear button-positive" ng-click="doDisagree()">Disagree</button>'+
                '</div>'+
                '<h1 class="title"></h1>'+
                '<div class="buttons">'+
                '<button class="button button-clear button-positive" ng-click="doAgree()">Agree</button>'+
                '</div>'+
                '</ion-footer-bar>'+
                '</div>',

            link: function(scope, element, attrs, controller) {
                //Insert Header
                var stepHeader = angular.element(
                    '<ion-header-bar>'+
                    '<div class="buttons">'+
                    '<button class="button button-clear button-positive icon ion-ios-arrow-left" ng-click="doStepBack()" irk-step-previous></button>'+
                    '</div>'+
                    '<h1 class="title" irk-step-title></h1>'+
                    '<div class="buttons">'+
                    '<button class="button button-clear button-positive" ng-click="doCancel()" irk-step-cancel>Cancel</button>'+
                    '</div>'+
                    '</ion-header-bar>'
                    );
                element.parent()[0].insertBefore(stepHeader[0], element[0]);
                $compile(stepHeader)(scope);
            }
        };
}])

.directive('irkTask', function() {
    return {
        restrict: 'E',
        require: '^irkOrderedTasks',
        link: function(scope, element, attrs, controller) {
            element.addClass('slider-slide irk-slider-slide');
        }
    };
})

.directive('irkStepTitle', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                if (stepType!='IRK-VISUAL-CONSENT-STEP' && stepType!='IRK-CONSENT-SHARING-STEP' && stepType!='IRK-CONSENT-REVIEW-STEP')
                    element.text('Step ' + (index+1) + ' of ' + count);
                else
                    element.text('');
            });
        }
    }
})

.directive('irkStepPrevious', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');

                element.toggleClass('ng-hide', index == 0 || (stepType=='IRK-COMPLETION-STEP' && (index == count - 1)));
            });
        }
    }
})

.directive('irkStepCancel', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');

                if (stepType=='IRK-COMPLETION-STEP' && (index == count - 1))
                    element.text("Done");
                else
                    element.text("Cancel");
            });
        }
    }
})

.directive('irkStepNext', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                element.addClass('irk-next-button');

                if (index == count - 1)
                    element.text("Done");
                else
                    element.text("Next");

                //Hide for Instruction Step, Visual Content Overview, Consent Sharing, and Consent Review
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var consentType = step.attr('type');
                element.toggleClass('ng-hide', stepType=='IRK-INSTRUCTION-STEP' || (stepType=='IRK-VISUAL-CONSENT-STEP' && consentType=='overview') || stepType=='IRK-CONSENT-SHARING-STEP' || (stepType=='IRK-CONSENT-REVIEW-STEP' && consentType=='review'));                

                //Show for Instruction Step only if footerAttach is set to true
                var footerAttach = step.attr('footer-attach')=='true';
                if (stepType=='IRK-INSTRUCTION-STEP' && footerAttach) {
                    element.toggleClass('ng-hide', false);
                    element.text(step.attr('button-text') ? step.attr('button-text') : 'Get Started');
                }

                //Enable only when current form is dirtied and valid
                var form = step.find('form');
                var input = form.find('input');
                if (form.length > 0  
                    && ((stepType!='IRK-DATE-QUESTION-STEP' && stepType!='IRK-TIME-QUESTION-STEP' && (form.hasClass('ng-pristine') || form.hasClass('ng-invalid')))
                        || ((stepType=='IRK-DATE-QUESTION-STEP' || stepType=='IRK-TIME-QUESTION-STEP') && (input.hasClass('ng-pristine') || input.hasClass('ng-invalid')))))
                    element.attr("disabled", "disabled");
                else
                    element.removeAttr("disabled");
            });
        }
    }
})

.directive('irkStepSkip', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            //Hide for instruction step or when input is required
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var stepOptional = step.attr('optional') || 'true';
                element.toggleClass('ng-hide', stepType=='IRK-INSTRUCTION-STEP' || stepOptional=='false');
            });
        }
    }
})

.directive('irkSurveyBar', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var consentType = step.attr('type');
                element.toggleClass('ng-hide', (stepType=='IRK-INSTRUCTION-STEP' || stepType=='IRK-VISUAL-CONSENT-STEP' || stepType=='IRK-CONSENT-SHARING-STEP' || stepType=='IRK-CONSENT-REVIEW-STEP' || stepType=='IRK-COUNTDOWN-STEP' || stepType=='IRK-COMPLETION-STEP' || stepType=='IRK-TWO-FINGER-TAPPING-INTERVAL-TASK'));
            });
        }
    }
})

.directive('irkConsentBar', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var consentType = step.attr('type');
                element.toggleClass('ng-hide', (stepType!='IRK-INSTRUCTION-STEP' && stepType!='IRK-VISUAL-CONSENT-STEP' && stepType!='IRK-CONSENT-SHARING-STEP' && stepType!='IRK-CONSENT-REVIEW-STEP'));
            });
        }
    }
})

.directive('irkConsentBarAgree', function() {
    return{
        restrict: 'A',
        link: function(scope, element, attrs, controller) {
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var consentType = step.attr('type');
                element.toggleClass('ng-hide', !(stepType=='IRK-CONSENT-REVIEW-STEP' && consentType=='review'));
            });
        }
    }
})

//======================================================================================
// Usage: <irk-instruction-step id="s1" title="Your title here." text="Additional text can go here." />
// =====================================================================================
.directive('irkInstructionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                    '<div class="irk-text-centered">'+
                    '<h2>'+attr.title+'</h2>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    (attr.link ? '<a class="button button-clear button-positive irk-learn-more" href="'+attr.link+'" target="_system">'+(attr.linkText ? attr.linkText : 'Learn more')+'</a>' : '')+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    (attr.image ? '<div class="irk-image-spacer"></div><div class="item irk-step-image '+attr.image+'"></div><div class="irk-image-spacer"></div>' : '')+
                    (attr.footerAttach && attr.footerAttach=='true'?'':'<button class="button button-outline button-positive irk-instruction-button" ng-click="$parent.doNext()">'+(attr.buttonText ? attr.buttonText : 'Get Started')+'</button>')+
                    '</div></div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }        
    }
})


//======================================================================================
// Usage: <irk-scale-question-step id="q1" title="Your question here." text="Additional text can go here." min="1" max="10" step="1" value="5" min-text="Low" max-text="High" optional="false"/>
// =====================================================================================
.directive('irkScaleQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<h3>{{$parent.formData.'+attr.id+' || \'&nbsp;\'}}</h3>'+
                    '<div class="range">'+
                    attr.min+
                    (attr.minText?'<br>'+attr.minText:'')+
                    '<input type="range" name="'+attr.id+'" min="'+attr.min+'" max="'+attr.max+'" step="'+attr.step+'" value="'+attr.value+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    attr.max+
                    (attr.maxText?'<br>'+attr.maxText:'')+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

      .directive('preventDrag', function ($ionicGesture, $ionicSlideBoxDelegate) {
          return {
              restrict: 'A',
              link    : function (scope, elem) {
                  var reportEvent = function (e) {
                      if (e.target.tagName.toLowerCase() === 'input') {
                          $parent.enableSlide(false);
                      } else {
                          $parent.enableSlide(true);
                      }
                  };
                  $ionicGesture.on('touch', reportEvent, elem);
              }
          }
      })



    .directive('irkTest', function ($ionicGesture, $ionicSlideBoxDelegate) {
        return {
            restrict: 'E',
            template: function (elem, attr) {
                return   	'<form name="form.'+attr.id+'"  novalidate>'+
                    
                   
                    '<div class="range">'+
                    attr.min+
                    (attr.minText?'<br>'+attr.minText:'')+
                    '<input type="range" name="' + attr.id + '" min="' + attr.min + '" max="' + attr.max + '" step="' + attr.step + '" value="' + attr.value + '" ng-model="$parent.formData.' + attr.id + '" ng-required="' + (attr.optional == 'false' ? 'true' : 'false') + '" ng-change="$parent.dirty()">' +
                    attr.max+
                    (attr.maxText?'<br>'+attr.maxText:'')+
                    '</div>'+
                    '</form>'
                
//                ' <form name="mrForm" class="irk-slider" novalidate>'+
//                    '<div class="irk-centered">'+
//                    '<div class="irk-text-centered">'+

//      '<div class="item range">'+
//  '<i class="icon ion-volume-low"></i>'+
//  '<input type="range" name="volume" min="0" max="100" value="35" step="5" ng-model="$parent.formData.' + attr.id + '" ng-required="' + (attr.optional == 'false' ? 'true' : 'false') + '" ng-change="$parent.dirty()">' +
//  '<i class="icon ion-volume-high"></i>'+
//'</div>'+

//                        '</div>'+
//                        '</div>'+
//          '</form>'
            },
            link: function (scope, element, attrs, controller) {
                element.addClass('irk-step');

                var self = scope;

                var doDisable = function (e) {
                    
                   scope.$parent.enableSlide(false);
                    //e.gesture.stopPropagation();
                    //e.gesture.preventDefault();
                    //e.stopPropagation();
                    //e.preventDefault();
 
                };

                var doEnable = function (e) {
                    scope.$parent.enableSlide(true);
                   // $ionicSlideBoxDelegate.enableSlide(true);

                };

                $ionicGesture.on('touch', doDisable, element);
                //$ionicGesture.on('release', doEnable, element);
            }
        }
    })

//======================================================================================
// Usage: <irk-boolean-question-step id="q1" title="Your question here." text="Additional text can go here." true-value="true" false-value="false" true-text="Yes" false-text="No" optional="false"/>
// =====================================================================================
.directive('irkBooleanQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return 	'<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-radio">'+
                    '<input type="radio" name="'+attr.id+'" value="'+(attr.trueValue?attr.trueValue:'true')+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    '<div class="radio-content">' +
                    '<div class="item-content disable-pointer-events irk-item-content">'+(attr.trueText?attr.trueText:(attr.trueValue?attr.trueValue:'True'))+'</div>'+
                    '<i class="radio-icon disable-pointer-events icon ion-checkmark positive"></i>'+
                    '</div>' +
                    '</label>'+
                    '<label class="item item-radio">'+
                    '<input type="radio" name="'+attr.id+'" value="'+(attr.falseValue?attr.falseValue:'false')+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    '<div class="radio-content">' +
                    '<div class="item-content disable-pointer-events irk-item-content">'+(attr.falseText?attr.falseText:(attr.falseValue?attr.falseValue:'False'))+'</div>'+
                    '<i class="radio-icon disable-pointer-events icon ion-checkmark positive"></i>'+
                    '</div>' +
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-question-step id="q1" title="Your question here." text="Additional text can go here." max-length="0" multiple-lines="true" placeholder="" optional="false"/>
// =====================================================================================
.directive('irkTextQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-input">'+
                    (attr.multipleLines=="false"
                    ?'<input type="text" placeholder="'+(attr.placeholder?attr.placeholder:'')+'" name="'+attr.id+'" '+(attr.maxLength && parseInt(attr.maxLength,10)>0?'maxlength="'+attr.maxLength+'"':'')+' ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'
                    :'<textarea rows="8" placeholder="'+(attr.placeholder?attr.placeholder:'')+'" name="'+attr.id+'" '+(attr.maxLength && parseInt(attr.maxLength,10)>0?'maxlength="'+attr.maxLength+'"':'')+' ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()"></textarea>'
                    )+
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-choice-question-step id="q1" title="Your question here." text="Additional text can go here." style="single/multiple" optional="false"></irk-text-choice-question-step>
// =====================================================================================
.directive('irkTextChoiceQuestionStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list" ng-transclude>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-text-choice value="choice" text="Your choice." detail-text="Additional text can go here."/>
// =====================================================================================
.directive('irkTextChoice', function() {
    return {
        restrict: 'E',
        require: '^?irkTextChoiceQuestionStep',
        template: function(elem, attr) {
            return  '<label class="item item-radio">'+
                    (elem.parent().attr("style")=="multiple"?
                    '<input type="checkbox" name="'+elem.parent().attr("id")+'" value="'+attr.value+'" checklist-model="$parent.$parent.formData.'+elem.parent().attr("id")+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.$parent.$parent.dirty()">'
                    :
                    '<input type="radio" name="'+elem.parent().attr("id")+'" value="'+attr.value+'" ng-model="$parent.$parent.formData.'+elem.parent().attr("id")+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.$parent.dirty()">'
                    )+
                    '<div class="radio-content">' +
                    '<div class="item-content disable-pointer-events irk-item-content">'+
                    attr.text+
                    (attr.detailText?'<p>'+attr.detailText+'</p>':'')+
                    '</div>'+
                    '<i class="radio-icon disable-pointer-events icon ion-checkmark positive"></i>'+
                    '</div>' +
                    '</label>'
        }
    }
})

//======================================================================================
// Usage: <irk-numeric-question-step id="q1" title="Your question here." text="Additional text can go here." unit="Your unit." placeholder="Your placeholder." min="0" max="10" optional="false"/>
// =====================================================================================
.directive('irkNumericQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-input">'+
                    '<input type="number" placeholder="'+(attr.placeholder?attr.placeholder:'')+'" name="'+attr.id+'" '+(attr.min?'min="'+attr.min+'"':'')+' '+(attr.max?'max="'+attr.max+'"':'')+' ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    (attr.unit && attr.unit.length>0?'<span class="input-label">'+attr.unit+'</span>':'')+
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-date-question-step id="q1" title="Your question here." text="Additional text can go here." optional="false"/>
// =====================================================================================
.directive('irkDateQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-input">'+
                    '<span class="input-label irk-input-label" ng-if="!$parent.formData.'+attr.id+'">Tap to select date.</span>'+
                    '<input class="irk-input" type="date" name="'+attr.id+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-time-question-step id="q1" title="Your question here." text="Additional text can go here." optional="false"/>
// =====================================================================================
.directive('irkTimeQuestionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-input">'+
                    '<span class="input-label irk-input-label" ng-if="!$parent.formData.'+attr.id+'">Tap to select time.</span>'+
                    '<input class="irk-input" type="time" name="'+attr.id+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">'+
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-value-picker-question-step id="q1" title="Your question here." text="Additional text can go here." optional="false"></irk-value-picker-question-step>
// =====================================================================================
.directive('irkValuePickerQuestionStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<label class="item item-input item-select irk-item-select">'+
                    '<span class="input-label irk-input-label">{{(!$parent.formData.'+attr.id+'?\'Tap to select answer.\':\'&nbsp;\')}}</span>'+
                    '<select ng-transclude name="'+attr.id+'" ng-model="$parent.formData.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.dirty()">' +
                    '</select>'+
                    '</label>'+
                    '</div>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-picker-choice value="choice" text="Your choice." />
// =====================================================================================
.directive('irkPickerChoice', function() {
    return {
        restrict: 'E',
        replace: true,
        require: '^?irkValuePickerQuestionStep',
        template: function(elem, attr) {
            return '<option value="'+attr.value+'">'+attr.text+'</option>';
        }
    }
})

//======================================================================================
// Usage: <irk-image-choice-question-step id="q1" title="Your question here." text="Additional text can go here." optional="false"></irk-image-choice-question-step>
// =====================================================================================
.directive('irkImageChoiceQuestionStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        controller: ['$scope', function($scope) {
            $scope.selected = {};
        }],
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="row" ng-transclude>'+
                    '</div>'+
                    '<h5 ng-if="$parent.formData.'+attr.id+'">{{selected.text}}</h5><span class="irk-input-label" ng-if="!$parent.formData.'+attr.id+'">Tap to select.</span>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: <irk-image-choice value="choice" text="Your choice." normal-state-image="" selected-state-image="" type="image" />
// =====================================================================================
.directive('irkImageChoice', function() {
    return {
        restrict: 'E',
        replace: true,
        require: '^?irkImageChoiceQuestionStep',
        template: function (elem, attr) {

            var imagetype = "irk-icon-large icon";

            if (attr.type === 'image') {
                imagetype = 'irk-image';
            }

            if (attr.type === 'smallicon') {
                imagetype = 'irk-icon-small icon';
            }

            return  '<div class="col">'+
                    '<button class="button button-clear '+imagetype+' '+attr.normalStateImage+'"></button>'+
                    '</div>';
        },
        link: function(scope, element, attrs) {
            var button = element.find('button');
            button.bind('click', function() {
                //Toggle selected state of image choices
                var buttons = element.parent().find('button');
                for (i=0; i<buttons.length; i++)
                {
                    var choice = angular.element(buttons[i]);
                    choice.removeClass('button-positive');
                    var parent = choice.parent();
                    choice.removeClass(parent.attr("selected-state-image"));
                    choice.addClass(parent.attr("normal-state-image"));
                }

                //Set selected state
                button.removeClass(attrs.normalStateImage);
                button.addClass(attrs.selectedStateImage);
                button.addClass('button-positive');

                //Set model
                var step = element.parent().parent().parent();
                var stepId = step.attr('id');
                scope.$parent.$parent.formData[stepId] = attrs.value;
                scope.selected.text = attrs.text;
                scope.$parent.$parent.dirty();
            });
        }
    }
})

//======================================================================================
// Usage: <irk-form-step id="q1" title="Your question here." text="Additional text can go here." optional="false"></irk-form-step>
// =====================================================================================
.directive('irkFormStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            return  '<form name="form.'+attr.id+'" class="irk-slider" novalidate>'+
                    '<ion-content class="has-header" style="top:80px;">'+
                    '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h3>'+attr.title+'</h3>'+
                    (attr.text ? '<p>'+attr.text+'</p>' : '')+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list" ng-transclude>'+
                    '</div>'+
                    '</ion-content>'+
                    '</form>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step irk-form-step');
        }
    }
})

//======================================================================================
// Usage: <irk-form-item title="Your section title." id="q1" text="Your choice." type="text/number/tel/email/..." placeholder="Your placeholder." optional="false"></irk-form-item>
// =====================================================================================
.directive('irkFormItem', function() {
    return {
        restrict: 'E',
        replace: true,
        require: '^?irkFormStep',
        template: function(elem, attr) {
            if (attr.title)
            {
                //Section divider will only have the title attribute
                return  '<div class="item item-divider irk-form-divider">'+attr.title+'</div>';
            }
            else
            {
                //Form input types (currently only supports HTML input types)
                return  '<label class="item item-input">'+
                        '<span class="input-label irk-form-input-label">'+attr.text+'</span>'+
                        '<input type="'+attr.type+'" placeholder="'+attr.placeholder+'" ng-model="$parent.$parent.$parent.formData.'+elem.parent().attr("id")+'.'+attr.id+'" ng-required="'+(attr.optional=='false'?'true':'false')+'" ng-change="$parent.$parent.$parent.dirty()">'+
                        '</label>';
            }
        },
        link: function(scope, element, attrs) {
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkVisualConsentStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            var consentType = attr.type;
            var consentTitle = '';
            var consentText = '';
            var consentImageClass = '';

            switch (consentType) {
                case 'overview':
                    consentTitle = 'Welcome';
                    consentText = 'Learn more about the study first';
                    consentImageClass = 'irk-consent-none';
                    break;
                case 'data-gathering':
                    consentTitle = 'Data Gathering';
                    consentText = 'Learn more about how data is gathered';
                    consentImageClass = 'irk-consent-01';
                    break;
                case 'privacy':
                    consentTitle = 'Privacy';
                    consentText = 'Learn more about how your privacy and identity are protected';
                    consentImageClass = 'irk-consent-02';
                    break;
                case 'data-use':
                    consentTitle = 'Data Use';
                    consentText = 'Learn more about how data is used';
                    consentImageClass = 'irk-consent-03';
                    break;
                case 'time-commitment':
                    consentTitle = 'Time Commitment';
                    consentText = 'Learn more about the study\'s impact on your time';
                    consentImageClass = 'irk-consent-04';
                    break;
                case 'study-survey':
                    consentTitle = 'Study Survey';
                    consentText = 'Learn more about the study survey';
                    consentImageClass = 'irk-consent-05';
                    break;
                case 'study-tasks':
                    consentTitle = 'Study Tasks';
                    consentText = 'Learn more about the tasks involved';
                    consentImageClass = 'irk-consent-06';
                    break;
                case 'withdrawing':
                    consentTitle = 'Withdrawing';
                    consentText = 'Learn more about withdrawing';
                    consentImageClass = 'irk-consent-07';
                    break;
                case 'custom':
                    consentTitle = attr.title;
                    consentText = attr.text;
                    consentImageClass = (attr.image?attr.image:'irk-consent-custom');
                    break;
            }

            if (consentType == 'only-in-document') 
            {
                return  '<div class="irk-learn-more-content" ng-transclude>'+
                        '</div>';
            }
            else 
            {
                return  '<div class="irk-centered">'+
                        '<div class="item irk-step-image '+consentImageClass+' positive"></div>'+
                        '<div class="irk-spacer"></div>'+
                        '<div class="irk-text-centered">'+
                        '<h2>'+consentTitle+'</h2>'+
                        '<p>'+attr.summary+'</p>'+
                        '</div>'+
                        '<a class="button button-clear button-positive irk-learn-more" ng-click="$parent.showLearnMore()">'+consentText+'</a>'+
                        '<div class="irk-learn-more-content" ng-transclude>'+
                        '</div>'+
                        '<div class="irk-spacer"></div>'+
                        (consentType=='overview'?'<button class="button button-outline button-positive irk-instruction-button" ng-click="$parent.doNext()">Get Started</button>':'')+
                        '</div>';
            }
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step irk-visual-consent-step');

            if (!angular.isDefined(element.attr('title'))) {
                var consentType = attrs.type;
                var consentTitle = '';

                switch (consentType) {
                    case 'overview':
                        consentTitle = 'Welcome';
                        break;
                    case 'data-gathering':
                        consentTitle = 'Data Gathering';
                        break;
                    case 'privacy':
                        consentTitle = 'Privacy';
                        break;
                    case 'data-use':
                        consentTitle = 'Data Use';
                        break;
                    case 'time-commitment':
                        consentTitle = 'Time Commitment';
                        break;
                    case 'study-survey':
                        consentTitle = 'Study Survey';
                        break;
                    case 'study-tasks':
                        consentTitle = 'Study Tasks';
                        break;
                    case 'withdrawing':
                        consentTitle = 'Withdrawing';
                        break;
                }

                element.attr('title', consentTitle);
            };
        }        
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkConsentSharingStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            return  '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h2>Sharing Options</h2>'+
                    '<p>'+attr.summary+'</p>'+
                    '<p>Sharing your coded study data more broadly (without information such as your name) may benefit this and future research.</p>'+
                    '</div>'+
                    '<a class="button button-clear button-positive irk-learn-more" ng-click="$parent.showLearnMore()">Learn more about data sharing</a>'+
                    '<div class="irk-learn-more-content" ng-transclude>'+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="list">'+
                    '<a class="item item-text-wrap item-icon-right irk-item-content" ng-click="$parent.doShare(\''+attr.id+'\',\''+attr.investigatorLongValue+'\')">'+
                    'Share my data with '+attr.investigatorLongDescription+
                    '<i class="icon ion-ios-arrow-right positive"></i>'+
                    '</a>'+
                    '<a class="item item-text-wrap item-icon-right irk-item-content" ng-click="$parent.doShare(\''+attr.id+'\',\''+attr.investigatorShortValue+'\')">'+
                    'Share my data with '+attr.investigatorShortDescription+
                    '<i class="icon ion-ios-arrow-right positive"></i>'+
                    '</a>'+
                    '</div>'+
                    '</div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkConsentReviewStep', function() {
    return {
        restrict: 'E',
        transclude: true,
        template: function(elem, attr) {
            var reviewType = attr.type;

            if (reviewType == 'review') {
                return  '<ion-content class="padding has-header has-footer">'+
                        '<div class="irk-text-centered">'+
                        '<h2>Review</h2>'+
                        '<p>Review the form below, and tap Agree if you\'re ready to continue.</p>'+
                        '</div>'+
                        '<div class="irk-text-left">'+
                        '<div class="irk-spacer"></div>'+
                        '<h4>'+attr.title+'</h4>'+
                        (attr.hasHtmlContent=='true'?'<div class="irk-consent-review-content" ng-transclude>':'<div class="irk-consent-review-derived-content">')+
                        '</div>'+
                        '</div>'+
                        '</ion-content>'
            }
            else if (reviewType == 'name') {
                return  '<form name="form'+attr.id+'" class="irk-slider" novalidate>'+
                        '<div class="irk-centered">'+
                        '<div class="irk-text-centered">'+
                        '<h2>Consent</h2>'+
                        '<p>'+attr.text+'</p>'+
                        '</div>'+
                        '</div>'+
                        '<div class="irk-spacer"></div>'+
                        '<div ng-transclude>'+
                        '</div>'+
                        '</form>'
            }
            else if (reviewType == 'signature') {
                return  '<div class="irk-centered">'+
                        '<div class="irk-text-centered">'+
                        '<h2>Signature</h2>'+
                        '<p>Please sign using your finger on the line below.</p>'+
                        '</div>'+
                        '<div class="irk-spacer"></div>'+
                        '<div ng-transclude>'+
                        '</div>'+
                        '</div>'
            }
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step irk-form-step');

            scope.$on("slideBox.slideChanged", function(e, index, count) {
                if (!scope.reviewContent) {
                    var reviewType = attrs.type;
                    if (reviewType == 'review' && (!attrs.hasHtmlContent || attrs.hasHtmlContent == 'false')) {
                        scope.reviewContent = '';
                        var steps = angular.element(document.querySelectorAll('.irk-visual-consent-step'));
                        for (var i=0; i<steps.length; i++) {
                            var step = angular.element(steps[i]);
                            var stepTitle = step.attr('title');
                            scope.reviewContent += '<div class="irk-spacer"></div>';
                            scope.reviewContent += '<h5>'+stepTitle+'</h4>';
                            var stepContent = angular.element(steps[i].querySelector('.irk-learn-more-content'));
                            scope.reviewContent += '<div>'+stepContent.html()+'</div>';
                        };
                        
                        var container = angular.element(document.querySelector('.irk-consent-review-derived-content'));
                        container.append(scope.reviewContent);
                    }
                }
            });
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkConsentName', function() {
    return {
        restrict: 'E',
        replace: true,
        require: '^?irkConsentReviewStep',
        template: function(elem, attr) {
            return  '<div class="list">'+
                    '<label class="item item-input">'+
                    '<span class="input-label irk-form-input-label">First Name</span>'+
                    '<input type="text" placeholder="Required" ng-model="$parent.$parent.formData.'+elem.parent().attr("id")+'.'+attr.id+'.givenName" ng-required="true" ng-change="$parent.$parent.dirty()">'+
                    '</label>'+
                    '<label class="item item-input">'+
                    '<span class="input-label irk-form-input-label">Last Name</span>'+
                    '<input type="text" placeholder="Required" ng-model="$parent.$parent.formData.'+elem.parent().attr("id")+'.'+attr.id+'.familyName" ng-required="true" ng-change="$parent.$parent.dirty()">'+
                    '</label>' +
                    '<label class="item item-input">' +
                    '<span class="input-label irk-form-input-label">Study ID</span>' +
                    '<input type="text" placeholder="Required" ng-model="$parent.$parent.formData.' + elem.parent().attr("id") + '.' + attr.id + '.studyID" ng-required="true" ng-change="$parent.$parent.dirty()">' +
                    '</label>' +
                    '</div>'
        },
        link: function(scope, element, attrs, controller) {
            var stepId = element.parent().parent().parent().attr("id");
            var sigId = attrs.id;
            scope.$parent.$parent.formData[stepId] = {};
            scope.$parent.$parent.formData[stepId][sigId] = { "title": attrs.title };
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkConsentSignature', function() {
    return {
        restrict: 'E',
        replace: true,
        require: '^?irkConsentReviewStep',
        controller: ['$scope', function($scope) {
            $scope.signaturePad = null;

            $scope.dirtySignature = function(isDirty) {
                var buttonClear = angular.element(document.querySelector('.irk-button-signature-clear'));
                var buttonSign = angular.element(document.querySelector('.irk-button-signature-sign'));
                buttonClear.toggleClass('ng-hide', !isDirty);
                buttonSign.toggleClass('ng-hide', isDirty);

                var next = angular.element(document.querySelectorAll('.irk-next-button'));
                if (!isDirty)
                {
                    angular.element(next[0]).attr("disabled", "disabled");
                    angular.element(next[1]).attr("disabled", "disabled");
                } 
                else 
                {
                    angular.element(next[0]).removeAttr("disabled");
                    angular.element(next[1]).removeAttr("disabled");
                }
            };

            $scope.clearSignature = function() {
                $scope.signaturePad.clear();
                $scope.$parent.$parent.formData.signature = null;
                $scope.dirtySignature(false);
            };

            $scope.saveSignature = function() {
                $scope.$parent.$parent.formData.signature = $scope.signaturePad.toDataURL();
            }   
        }],
        template: function(elem, attr) {
            return  '<div>'+
                    '<canvas id="signatureCanvas" class="irk-signature-canvas"></canvas>'+
                    '<a class="button button-clear button-positive irk-button-signature-clear" ng-click="clearSignature()" ng-hide="true">Clear</a>'+
                    '<a class="button button-clear button-dark irk-button-signature-sign" ng-disabled="true">Sign Here</a>'+
                    '</div>'
        },
        link: function(scope, element, attrs, controller) {            
            scope.$on("slideBox.slideChanged", function(e, index, count) {
                //Show only for Consent Review Signature
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');
                var consentType = step.attr('type');

                if (stepType=='IRK-CONSENT-REVIEW-STEP' && consentType=='signature') {
                    //Initially set the signature canvas
                    if (!scope.signaturePad) {
                        var canvas = document.getElementById('signatureCanvas');
                        scope.signaturePad = new SignaturePad(canvas);

                        var canvasEl = angular.element(canvas);
                        canvasEl.on('touchstart', function (e) {
                            scope.dirtySignature(true);
                        });

                        canvasEl.on('touchend', function (e) {
                            scope.saveSignature();
                        });                        
                    }

                    //Set the Next/Done state
                    if (!scope.signaturePad || scope.signaturePad.isEmpty()) {
                        scope.dirtySignature(false);
                    }
                }
            });
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkCountdownStep', function() {
    return {
        restrict: 'E',
        controller: ['$scope', '$element', '$attrs', '$interval', function($scope, $element, $attrs, $interval) {
            $scope.startCountdown = function() {
                $scope.duration = ($attrs.duration?$attrs.duration:5)+1;
                $scope.countdown = $scope.duration;

                var index = $scope.$parent.currentSlide;
                var countdownEl = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-countdown'));
                countdownEl.toggleClass('irk-countdown-started', false);

                $scope.$parent.currentCountdown = $interval(function() {
                    countdownEl.toggleClass('irk-countdown-started', true);

                    if ($scope.countdown == 0)
                        $scope.$parent.doStepNext();
                    else
                        $scope.countdown--;
                }, 1000, $scope.duration+1);
            }   
        }],
        template: function(elem, attr) {
            return  '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                    '<p>Starting activity in</p>'+
                    '<div class="irk-countdown">'+
                    '<ng-dial-gauge id="'+attr.id+'"'+
                    '   ng-model="countdown"'+
                    '   scale-min="0"'+
                    '   scale-max="{{duration || 5}}"'+
                    '   border-width="1"'+
                    '   track-color="#ffffff"'+
                    '   bar-color="#387ef5"'+
                    '   bar-color-end="#387ef5"'+
                    '   bar-width="2"'+
                    '   angle="360"'+
                    '   rotate="360"'+
                    '   scale-minor-length="0"'+
                    '   scale-major-length="0"'+
                    '   line-cap="butt"'+
                    '/>'+
                    '</div>'+
                    '</div></div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');

            scope.$on("slideBox.slideChanged", function(e, index, count) {
                //Start the countdown
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');

                if (stepType=='IRK-COUNTDOWN-STEP') {
                    scope.startCountdown();
                }
            });            
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkCompletionStep', function() {
    return {
        restrict: 'E',
        template: function(elem, attr) {
            return  '<div class="irk-offcentered-container"><div class="irk-offcentered-content">'+
                    '<div class="irk-text-centered">'+
                    '<h2>Activity Complete</h2>'+
                    '<p>Your data will be analyzed and you will be notified when your results are ready.</p>'+
                    (attr.link ? '<a class="button button-clear button-positive irk-learn-more" href="'+attr.link+'" target="_system">'+(attr.linkText ? attr.linkText : 'Learn more')+'</a>' : '')+
                    '</div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="irk-spacer"></div>'+
                    '<div class="item irk-step-image">'+
                    '<i class="irk-completion-icon icon ion-ios-checkmark positive" ng-click="$parent.doNext()"></i>'+
                    '</div>'+
                    '<div class="irk-image-spacer"></div>'+
                    '</div></div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');
        }
    }
})

//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkTwoFingerTappingIntervalTask', function() {
    return {
        restrict: 'E',
        controller: ['$scope', '$element', '$attrs', '$interval', function($scope, $element, $attrs, $interval) {

            $scope.toggleProgressBar = function(isVisible) {
                var index = $scope.$parent.currentSlide;
                var progressEl = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-progress'));
                progressEl.toggleClass('irk-progress-started', isVisible);
            }

            $scope.startProgress = function() {
                $scope.duration = ($attrs.duration?$attrs.duration:20);
                $scope.progress = 0;
                $scope.toggleProgressBar(true);

                $scope.$parent.currentCountdown = $interval(function() {
                    if ($scope.progress == $scope.duration-1)
                        $scope.$parent.doStepNext();
                    else
                        $scope.progress++;
                }, 1000, $scope.duration);
            } 

            $scope.initActiveTask = function() {
                $scope.taskStarted = false;
                $scope.toggleProgressBar(false);
            }

            $scope.startActiveTask = function() {
                $scope.tapsCount = 0;  
                $scope.tapsStartTime = (new Date()).getTime();  
                $scope.$parent.formData[$attrs.id] = {};
                $scope.$parent.formData[$attrs.id].samples = {};

                $scope.taskStarted = true;
                $scope.startProgress();
            }

            $scope.tap = function(buttonId) {
                if (!$scope.taskStarted) {
                    $scope.startActiveTask();
                }

                var tapsCurrentTime = ((new Date()).getTime() - $scope.tapsStartTime) / 1000;  
                $scope.$parent.formData[$attrs.id].samples[tapsCurrentTime] = (buttonId?buttonId:'none');
                if (buttonId) $scope.tapsCount++;
            }
        }],
        template: function(elem, attr) {
            return  '<div class="irk-centered">'+
                    '<div class="irk-text-centered">'+
                    '<h2>Tap the buttons as quickly as you can using two fingers.</h2>'+
                    '<progress class="irk-progress" max="{{duration}}" value="{{progress}}"></progress>'+
                    '<div class="irk-spacer"></div>'+
                    '<h4>Total Taps</h4>'+
                    '<h1>{{tapsCount || 0}}</h1>'+
                    '</div>'+
                    '</div>'+
                    '<div class="irk-tap-container" ng-click="tap()">'+
                    '<div class="irk-tap-button-container">'+
                    '<button class="button button-outline button-positive irk-tap-button" ng-click="tap(\'button 1\');$event.stopPropagation()">Tap</button>'+
                    '<button class="button button-outline button-positive irk-tap-button" ng-click="tap(\'button 2\');$event.stopPropagation()">Tap</button>'+
                    '</div>'+
                    '</div>'
        },
        link: function(scope, element, attrs, controller) {
            element.addClass('irk-step');

            scope.$on("slideBox.slideChanged", function(e, index, count) {
                var step = angular.element(document.querySelectorAll('.irk-slider-slide')[index].querySelector('.irk-step'));
                var stepType = step.prop('tagName');

                if (stepType=='IRK-TWO-FINGER-TAPPING-INTERVAL-TASK') {
                    scope.initActiveTask();
                }
            });            
        }
    }
})


//======================================================================================
// Usage: 
// =====================================================================================
.directive('irkPhotoStep', function () {
    return {
        restrict: 'E',
       
        template: function (elem, attr) {
            return '<form name="form.' + attr.id + '" class="irk-slider" novalidate>' +
                    '<div class="irk-centered">' +
                    '<div class="irk-text-centered">' +
                    '<h3>' + attr.title + '</h3>' +
                    (attr.text ? '<p>' + attr.text + '</p>' : '') +
                    '</div>' +
                    '</div>' +
                    '<div class="irk-spacer"></div>' +
                    
                    
                    '<button class="button button-positive">Take Photo</button>' +
                    '<div class="irk-spacer"></div>' +
                    '<div class="photoDiv">' +
                    '<img id="img' + attr.id + '" src="" class="photoImage" />' +
                    '</div>' +
                    '</form>'
        },
        link: function (scope, element, attrs, controller) {
            element.addClass('irk-step');
            var button = element.find('button');

            button.bind('click', function () {

                if (typeof navigator.camera !== 'undefined') {
                    // We can access the camera

                    navigator.camera.getPicture(function (imageData) {
                        // Photo succeeded, so need to save it!

                        var stepId = element.attr('id');
                        scope.$parent.formData[stepId] = imageData;
                        var imageID = "img" + stepId;
                        var imagePhoto = document.getElementById(imageID);
                        imagePhoto.src = "data:image/jpeg;base64," + imageData;
                        scope.$parent.dirty();

                    

                    },
                    function () {
                        alert("The photo was not successful.");
                    
                    },
                    {
                        // Camera options
                        quality: 80,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        targetHeight: 850,
                        targetWidth: 500,
                        encodingType: Camera.EncodingType.JPEG,
                        correctOrientation: true,
                        saveToPhotoAlbum: false,
                        cameraDirection: Camera.Direction.FRONT,
                        allowEdit: false
                    });

                }
                else {
                
                    // Just a test for when developing on a browser!
                    var imageData = "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";
                    //Set model
                    ;
                    var stepId = element.attr('id');
                    scope.$parent.formData[stepId] = imageData;

                    var imageID = "img" + stepId;
                    var imagePhoto = document.getElementById(imageID);
                    imagePhoto.src = "data:image/jpeg;base64," + imageData;
                    scope.$parent.dirty();

                    
                }
            });
                
          
            
        }
    }
})
