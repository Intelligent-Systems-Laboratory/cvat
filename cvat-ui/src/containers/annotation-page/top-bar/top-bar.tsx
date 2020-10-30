// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import copy from 'copy-to-clipboard';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';
import InputNumber from 'antd/lib/input-number';
import { SliderValue } from 'antd/lib/slider';
// ISL GLOBAL ATTRIBUTES
import Select, { SelectValue } from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
// ISL END
import notification from 'antd/lib/notification';
import {
    changeFrameAsync,
    switchPlay,
    saveAnnotationsAsync,
    collectStatisticsAsync,
    showStatistics as showStatisticsAction,
    undoActionAsync,
    redoActionAsync,
    searchAnnotationsAsync,
    searchEmptyFrameAsync,
    changeWorkspace as changeWorkspaceAction,
    activateObject,
    switchTracking, // EDITED FOR USER STORY 12/13
    // ISL GLOBAL ATTRIBUTES
    editGlobalAttributes as editGlobalAttributesAction,
    editGlobalAttributes,
    editLabels,
    fetchAttributes,
    saveAttributes,
    setGlobalAttributesVisibility,
    switchToggleFeatureModal,
    // ISL END
} from 'actions/annotation-actions';
import { Canvas } from 'cvat-canvas-wrapper';

import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { CombinedState, FrameSpeed, Workspace } from 'reducers/interfaces';

// ISL GLOBAL ATTRIBUTES
import Modal from 'antd/lib/modal';
import { Row, Col } from 'antd/lib/grid';
import Button from 'antd/lib/button';
import Menu from 'antd/lib/menu';
import Dropdown from 'antd/lib/dropdown';
import Text from 'antd/lib/typography/Text';
import DownOutlined from 'antd/lib/icon'
import './GlobalAttributes.css';
import ButtonGroup from 'antd/lib/button/button-group';
import jobList from 'components/task-page/job-list';
// ISL END

interface StateToProps {
    // ISL GLOBAL ATTRIBUTES
    globalAttributesVisibility: boolean;
    globalAttributesDB:any;
    // ISL END
    jobInstance: any;
    frameNumber: number;
    frameFilename: string;
    frameStep: number;
    frameSpeed: FrameSpeed;
    frameDelay: number;
    playing: boolean;
    saving: boolean;
    canvasIsReady: boolean;
    savingStatuses: string[];
    undoAction?: string;
    redoAction?: string;
    autoSave: boolean;
    autoSaveInterval: number;
    workspace: Workspace;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
    featuresToggle:any; // ISL FEATURES TOGGLE
}

interface DispatchToProps {
    onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
    showStatistics(sessionInstance: any): void;
    undo(sessionInstance: any, frameNumber: any): void;
    redo(sessionInstance: any, frameNumber: any): void;
    searchAnnotations(sessionInstance: any, frameFrom: number, frameTo: number): void;
    searchEmptyFrame(sessionInstance: any, frameFrom: number, frameTo: number): void;
    changeWorkspace(workspace: Workspace): void;
    // ISL GLOBAL ATTRIBUTES
    onEditGlobalAttributes(globalAttributes:any): void;
    onEditLabels(jobInstance:any,attributes:any,selected:any):void;
    onFetchAttributes(jobInstance:any):void;
    onSaveAttributes(jobInstance:any,attributes:any, selected:any): void;
    onSetGlobalAttributesVisibility(visibility:boolean):void;
    // ISL END
    // ISL FEATURES TOGGLE
    showFeaturesToggle(visibility:boolean):void;
    // ISL END
}
function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                playing,
                frame: {
                    filename: frameFilename,
                    number: frameNumber,
                    delay: frameDelay,
                },
            },
            annotations: {
                saving: {
                    uploading: saving,
                    statuses: savingStatuses,
                },
                history,
            },
            job: {
                instance: jobInstance,
            },
            canvas: {
                ready: canvasIsReady,
                instance: canvasInstance,
            },
            workspace,
            globalAttributesVisibility,
            globalAttributesDB,
            featuresToggle:featuresToggle,
        },
        settings: {
            player: {
                frameSpeed,
                frameStep,
            },
            workspace: {
                autoSave,
                autoSaveInterval,
            },
        },
        shortcuts: {
            keyMap,
            normalizedKeyMap,
        },
    } = state;

    return {
        frameStep,
        frameSpeed,
        frameDelay,
        playing,
        canvasIsReady,
        saving,
        savingStatuses,
        frameNumber,
        frameFilename,
        jobInstance,
        undoAction: history.undo.length ? history.undo[history.undo.length - 1][0] : undefined,
        redoAction: history.redo.length ? history.redo[history.redo.length - 1][0] : undefined,
        autoSave,
        autoSaveInterval,
        workspace,
        keyMap,
        normalizedKeyMap,
        canvasInstance,
        globalAttributesVisibility,
        globalAttributesDB,
        featuresToggle,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void {
            dispatch(changeFrameAsync(frame, fillBuffer, frameStep));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchPlay(playing));
        },
        onSaveAnnotation(sessionInstance: any): void {
            dispatch(saveAnnotationsAsync(sessionInstance));
        },
        showStatistics(sessionInstance: any): void {
            dispatch(collectStatisticsAsync(sessionInstance));
            dispatch(showStatisticsAction(true));
        },
        undo(sessionInstance: any, frameNumber: any): void {
            dispatch(undoActionAsync(sessionInstance, frameNumber));
        },
        redo(sessionInstance: any, frameNumber: any): void {
            dispatch(redoActionAsync(sessionInstance, frameNumber));
        },
        searchAnnotations(sessionInstance: any, frameFrom: number, frameTo: number): void {
            dispatch(searchAnnotationsAsync(sessionInstance, frameFrom, frameTo));
        },
        searchEmptyFrame(sessionInstance: any, frameFrom: number, frameTo: number): void {
            dispatch(searchEmptyFrameAsync(sessionInstance, frameFrom, frameTo));
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(activateObject(null, null));
            dispatch(changeWorkspaceAction(workspace));
        },
        onEditGlobalAttributes(globalAttributes: any): void {
            dispatch(editGlobalAttributesAction(globalAttributes));
        },
        onEditLabels(jobInstance:any,attributes:any,selected:any): void {
            dispatch(editLabels(jobInstance,attributes,selected));
        },
        onFetchAttributes(jobInstance:any): void {
            dispatch(fetchAttributes(jobInstance));
        },
        onSaveAttributes(jobInstance:any,attributes:any, selected:any): void {
            dispatch(saveAttributes(jobInstance,attributes,selected));
        },
        onSetGlobalAttributesVisibility(visibility:boolean): void{
            dispatch(setGlobalAttributesVisibility(visibility));
        },
        showFeaturesToggle(visibility:boolean): void{
            dispatch(switchToggleFeatureModal(visibility));
        },
    };
}

interface State {
    prevButtonType: 'regular' | 'filtered' | 'empty';
    nextButtonType: 'regular' | 'filtered' | 'empty';
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;
class AnnotationTopBarContainer extends React.PureComponent<Props, State> {
    private inputFrameRef: React.RefObject<InputNumber>;
    private autoSaveInterval: number | undefined;
    private unblock: any;

    constructor(props: Props) {
        super(props);
        this.inputFrameRef = React.createRef<InputNumber>();

        props.onFetchAttributes(props.jobInstance);
        this.initiateGlobalAttributesModal(); // ISL GLOBAL ATTRIBUTES
        this.state = {
            prevButtonType: 'regular',
            nextButtonType: 'regular',
        };
    }

    public componentDidMount(): void {
        const { autoSaveInterval, history, jobInstance } = this.props;

        //ISL GLOBAL ATTRIBUTES
        const { onFetchAttributes,
            globalAttributesDB
        } = this.props;

        this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);
        // ISL END

        this.unblock = history.block((location: any) => {
            const { task, id: jobID } = jobInstance;
            const { id: taskID } = task;

            if (jobInstance.annotations.hasUnsavedChanges()
                && location.pathname !== `/tasks/${taskID}/jobs/${jobID}`) {
                return 'You have unsaved changes, please confirm leaving this page.';
            }
            return undefined;
        });

        window.addEventListener('beforeunload', this.beforeUnloadCallback);
        this.hideGlobalAttributesModal(); // ISL GLOBAL ATTRIBUTES
    }

    public componentDidUpdate(prevProps: Props): void {
        const {
            jobInstance,
            frameSpeed,
            frameNumber,
            frameDelay,
            playing,
            canvasIsReady,
            canvasInstance,
            onSwitchPlay,
            onChangeFrame,
            autoSaveInterval,
            globalAttributesVisibility,
            globalAttributesDB,
        } = this.props;

        // ISL GLOBAL ATTRIBUTES
        if (frameNumber != prevProps.frameNumber) {
            // If the frame changes, get the attributes for that frame.
            this.fetchAttributeForCurrentFrame(frameNumber);
            console.log('fetchAttributeForCurrentFrame');
        }

        if(globalAttributesDB != prevProps.globalAttributesDB){
            // Get the saved attributes from the props. This should only happen once.
            if(!this.fetchedAttributesFromServer && Object.keys(globalAttributesDB).length > 0){
                this.fetchedAttributesFromServer = true;
                this.globalAttributesDB = globalAttributesDB['data']['attributes'];
                this.globalAttributesSelectedDB = globalAttributesDB['data']['selected'];
            }
            if(frameNumber == 0){
                this.fetchAttributeForCurrentFrame(frameNumber);
            }
        }
        // ISL END
        if (autoSaveInterval !== prevProps.autoSaveInterval) {
            if (this.autoSaveInterval) window.clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);
        }

        if (playing && canvasIsReady) {
            if (frameNumber < jobInstance.stopFrame) {
                let framesSkiped = 0;
                if (frameSpeed === FrameSpeed.Fast
                    && (frameNumber + 1 < jobInstance.stopFrame)) {
                    framesSkiped = 1;
                }
                if (frameSpeed === FrameSpeed.Fastest
                    && (frameNumber + 2 < jobInstance.stopFrame)) {
                    framesSkiped = 2;
                }

                setTimeout(() => {
                    const { playing: stillPlaying } = this.props;
                    if (stillPlaying) {
                        if (canvasInstance.isAbleToChangeFrame()) {
                            onChangeFrame(
                                frameNumber + 1 + framesSkiped,
                                stillPlaying, framesSkiped + 1,
                            );
                        } else {
                            onSwitchPlay(false);
                        }
                    }
                }, frameDelay);
            } else {
                onSwitchPlay(false);
            }
        }
        // ISL GLOBAL ATTRIBUTES
        if (this.firstTime && globalAttributesVisibility){
            // Detect if there are previous annotations. Open the global attributes modal accordingly.
            // console.log('FIRST TIME DETECTED');
            this.showGlobalAttributesModal();
            this.waitPageToCompleteLoading();
        }
        // ISL END
    }

    public componentWillUnmount(): void {
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
    }

    private undo = (): void => {
        const {
            undo,
            jobInstance,
            frameNumber,
            canvasInstance,
        } = this.props;

        if (canvasInstance.isAbleToChangeFrame()) {
            undo(jobInstance, frameNumber);
        }
    };

    private redo = (): void => {
        const {
            redo,
            jobInstance,
            frameNumber,
            canvasInstance,
        } = this.props;

        if (canvasInstance.isAbleToChangeFrame()) {
            redo(jobInstance, frameNumber);
        }
    };

    private showStatistics = (): void => {
        const { jobInstance, showStatistics } = this.props;

        showStatistics(jobInstance);
    };

    private onSwitchPlay = (): void => {
        const {
            frameNumber,
            jobInstance,
            onSwitchPlay,
            playing,
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        } else if (frameNumber < jobInstance.stopFrame) {
            onSwitchPlay(true);
        }
    };

    private onFirstFrame = (): void => {
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = jobInstance.startFrame;
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onBackward = (): void => {
        const {
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .max(jobInstance.startFrame, frameNumber - frameStep);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onPrevFrame = (): void => {
        const { prevButtonType } = this.state;
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
            searchAnnotations,
            searchEmptyFrame,
        } = this.props;
        const { startFrame } = jobInstance;

        const newFrame = Math
            .max(jobInstance.startFrame, frameNumber - 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            if (prevButtonType === 'regular') {
                this.changeFrame(newFrame);
            } else if (prevButtonType === 'filtered') {
                searchAnnotations(jobInstance, frameNumber - 1, startFrame);
            } else {
                searchEmptyFrame(jobInstance, frameNumber - 1, startFrame);
            }
        }
    };

    private onNextFrame = (): void => {
        const { nextButtonType } = this.state;
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
            searchAnnotations,
            searchEmptyFrame,
        } = this.props;
        const { stopFrame } = jobInstance;

        const newFrame = Math
            .min(jobInstance.stopFrame, frameNumber + 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            if (nextButtonType === 'regular') {
                this.changeFrame(newFrame);
            } else if (nextButtonType === 'filtered') {
                searchAnnotations(jobInstance, frameNumber + 1, stopFrame);
            } else {
                searchEmptyFrame(jobInstance, frameNumber + 1, stopFrame);
            }
        }
    };

    private onForward = (): void => {
        const {
            frameNumber,
            frameStep,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .min(jobInstance.stopFrame, frameNumber + frameStep);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onLastFrame = (): void => {
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = jobInstance.stopFrame;
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onSetPreviousButtonType = (type: 'regular' | 'filtered' | 'empty'): void => {
        this.setState({
            prevButtonType: type,
        });
    };

    private onSetNextButtonType = (type: 'regular' | 'filtered' | 'empty'): void => {
        this.setState({
            nextButtonType: type,
        });
    };

    private onSaveAnnotation = (): void => {
        const {
            onSaveAnnotation,
            jobInstance,
            onSaveAttributes, // ISL GLOBAL ATTRIBUTES
        } = this.props;

        onSaveAttributes(jobInstance,this.globalAttributesDB,this.globalAttributesSelectedDB);
        onSaveAnnotation(jobInstance);
    };

    private onChangePlayerSliderValue = (value: SliderValue): void => {
        const { playing, onSwitchPlay } = this.props;
        if (playing) {
            onSwitchPlay(false);
        }
        this.changeFrame(value as number);
    };

    private onChangePlayerInputValue = (value: number): void => {
        const { onSwitchPlay, playing, frameNumber } = this.props;
        if (value !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(value);
        }
    };

    private onURLIconClick = (): void => {
        const { frameNumber } = this.props;
        const { origin, pathname } = window.location;
        const url = `${origin}${pathname}?frame=${frameNumber}`;
        copy(url);
    };

    private beforeUnloadCallback = (event: BeforeUnloadEvent): string | undefined => {
        const { jobInstance } = this.props;
        if (jobInstance.annotations.hasUnsavedChanges()) {
            const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }
        return undefined;
    };

    private autoSave(): void {
        const { autoSave, saving } = this.props;

        if (autoSave && !saving) {
            this.onSaveAnnotation();
        }
    }

    private changeFrame(frame: number): void {
        const { onChangeFrame, canvasInstance } = this.props;
        if (canvasInstance.isAbleToChangeFrame()) {
            onChangeFrame(frame);
        }
    }

    // ISL GLOBAL ATTRIBUTES
    private globalAttributes: any;
    private globalAttributesSelected: any;
    private globalAttributesDB: any[] = [];
    private globalAttributesSelectedDB: any[] = [];
    private currentSpatialTag: string = "open";
    private frame_start: number = 0;
    private frame_end: number = 0;
    private AllAttributes: any[] = [];
    private AllAttributeNames: any[] = [];
    private openList: any[] = ["Lighting", "Light Amount", "Color Intensity", "Weather", "Scene Temperature", "Surface Property", "Seasons", "Additional Attributes"];
    private enclosedList: any[] = ["Lighting", "Surface Property", "Light Amount", "Color Intensity", "Scene Temperature"];
    private dropdownEntries: any[] = [];
    private firstTime: boolean = true;
    private requireReload: boolean = false;
    private addAttribute: boolean = false;
    private dropDownAttributes:any = {};
    private fetchedAttributesFromServer:boolean = false;
    private globalAttributesModal = Modal.confirm({
        title: <Text className='cvat-title'>Global Attributes</Text>,
        visible: true,
        content: (<div></div>),
        width: 800,
        okText: 'OK',
        icon: '',
        okButtonProps: {
            style: {
                width: '100px',
            },
        },

        cancelText: 'Cancel',
        cancelButtonProps: {
            style: {
                width: '100px',
            },
        },
        onOk: (event) => this.handleOk(event),
        onCancel: (event) => this.handleCancel(event),
    });

    private getAllAttributes = (): void => {
        const { jobInstance } = this.props;
        for (var i = 0; i < jobInstance.task.labels[0].attributes.length; i++) {
            if (jobInstance.task.labels[0].attributes[i].inputType !== "") {
                this.AllAttributes[jobInstance.task.labels[0].attributes[i].name] = jobInstance.task.labels[0].attributes[i].values.slice();
                this.AllAttributeNames[i] = jobInstance.task.labels[0].attributes[i].name;
            }
        }
        // console.log(this.AllAttributes);
    }
    private initDropDown = (): void =>{
        this.dropDownAttributes = {
            vehicles:[
                {
                    name: 'type',
                    value: ["ignore",
                    "car",
                    "suv",
                    "van",
                    "taxi",
                    "truck",
                    "motorcycle",
                    "bicycle",
                    "tricycle",
                    "jeep",
                    "bus"]
                },
                {
                    name:'FOV',
                    value:['front','side','back']
                }
            ],
            people:[
                {
                    name: 'sex',
                    value: ['male','female']
                }
            ],
            open:[
                {
                    name: 'Scene Temperature',
                    value: ['Warm/Hot','Cold']
                }
            ],
            enclosed:[
                {
                    name: 'Light Amount',
                    value: ['dark','bright','glowing']
                }
            ],
            counting:[
                {
                    name:'counting',
                    value: ['counting 1','counting2']
                }
            ],
            tracking:[
                {
                    name:'tracking',
                    value: ['tracking 1','tracking 2']
                }
            ],
            detection:[
                {
                    name: 'detection',
                    value: ['detection 1', 'detection 2']
                }
            ]

        }
    }
    private updateDropDown = ():void => {
        this.AllAttributes = [];
        this.getAllAttributes();
        if(this.spatial == 'open'){
            for (let attribute of this.dropDownAttributes['open']){
                this.AllAttributes.push(attribute);
            }
            // for (var i = 0; i < this.AllAttributes.length; i++) {
            //     // console.log(this.dropDownAttributes['enclosed']);
            //     for(let attribute of this.dropDownAttributes['enclosed']){
            //         console.log(attribute);
            //         // console.log('MARKER',this.AllAttributes[i].name,attribute.name);
            //         if(this.AllAttributes[i].name == attribute.name){
            //             this.AllAttributes.splice(i,1);
            //             console.log('MARKER');
            //         }
            //     }

            // }
        }else{
            // enclosed
            for (let attribute of this.dropDownAttributes['enclosed']){
                this.AllAttributes.push(attribute);
            }
            // for (var i = 0; i < this.AllAttributes.length; i++) {
            //     for(let attribute in this.dropDownAttributes['open']){
            //         if(this.AllAttributes[i].name == attribute.name){
            //             this.AllAttributes.splice(i,1);
            //         }
            //     }

            // }
        }
        if(this.subject == 'vehicle'){
            for (let attribute of this.dropDownAttributes['vehicle']){
                this.AllAttributes.push(attribute);
            }
        }else{
            //people
            for (let attribute of this.dropDownAttributes['people']){
                this.AllAttributes.push(attribute);
            }
        }
        if(this.useCase == 'counting'){
            for (let attribute of this.dropDownAttributes['counting']){
                this.AllAttributes.push(attribute);
            }
        }else if(this.useCase == 'tracking'){
            for (let attribute of this.dropDownAttributes['tracking']){
                this.AllAttributes.push(attribute);
            }
        }else{
            //detection
            for (let attribute of this.dropDownAttributes['detection']){
                this.AllAttributes.push(attribute);
            }
        }
        this.AllAttributeNames = [];
        for (var i = 0; i < this.AllAttributes.length; i++) {
            this.AllAttributeNames[i] = this.AllAttributes[i].name;
        }
    }
    private initiateGlobalAttributesModal = (): void => {
        const { jobInstance,globalAttributesDB } = this.props;
        this.getAllAttributes();
        this.globalAttributes = {};
        this.globalAttributesSelected = {};
        let globalAttributesWithFrameRange: any = {};
        let globalAttributesSelectedWithFrameRange: any = {};

        this.initDropDown();

        // Assign global attributes
        // console.log("init",jobInstance.task.labels[0]);
        for (var i = 0; i < jobInstance.task.labels[0].attributes.length; i++) {
            // Initiate global attributes for the modal. e.g. name = 'weather', values = ['clear', 'foggy', ...]
            if (jobInstance.task.labels[0].attributes[i].inputType == "select") {
                this.globalAttributes[jobInstance.task.labels[0].attributes[i].name] = jobInstance.task.labels[0].attributes[i].values.slice();
                this.globalAttributesSelected[jobInstance.task.labels[0].attributes[i].name] = jobInstance.task.labels[0].attributes[i].defaultValue;
            }
        }
        // console.log(this.globalAttributes);
        // console.log(this.globalAttributesSelected);
        this.frame_start = 0;
        this.frame_end = jobInstance.stopFrame;
        globalAttributesWithFrameRange = {
            frame_start: this.frame_start,
            frame_end: jobInstance.stopFrame,
            attributes: this.globalAttributes,
        }
        globalAttributesSelectedWithFrameRange = {
            frame_start: this.frame_start,
            frame_end: jobInstance.stopFrame,
            attributes: this.globalAttributesSelected,
        }
        this.globalAttributesDB.push(globalAttributesWithFrameRange);
        this.globalAttributesSelectedDB.push(globalAttributesSelectedWithFrameRange);
        // console.log('Attributes DB: ',this.globalAttributesDB);
        // console.log('Selected DB: ',this.globalAttributesSelectedDB);
        this.dropdownEntries = [...new Set([...this.AllAttributeNames, ...this.openList])];

        this.updateGlobalAttributesModal();

        // console.log('Initiate global attributes modal complete');
    }

    private spatial:string = "open";
    private useCase:string = 'counting';
    private subject:string = 'vehicles';
    private changeSpatialTag = (tag_str: string): void => {
        this.currentSpatialTag = tag_str;
        // console.log('tag=',this.currentSpatialTag);
        // console.log (this.AllAttributes);
        //spatialprops
        if (this.currentSpatialTag == "open") {
            document.getElementById('spatialTagOpen').className = "radioclicked";
            document.getElementById('spatialTagEnclosed').className = "radio-toolbar";

            this.dropdownEntries = [...new Set([...this.AllAttributeNames, ...this.openList])];
            this.updateSelectedAttributeValues(0);
            this.updateGlobalAttributesModal;
        }
        else if (this.currentSpatialTag == "enclosed"){
            document.getElementById('spatialTagEnclosed').className = "radioclicked";
            document.getElementById('spatialTagOpen').className = "radio-toolbar";
            this.dropdownEntries = [...new Set([...this.AllAttributeNames, ...this.enclosedList])];
            this.updateSelectedAttributeValues(0);
            this.updateGlobalAttributesModal;
        }

        //subjects
        if (this.currentSpatialTag == "vehicles") {
            document.getElementById('spatialTagVehicles').className = "radioclicked";
            document.getElementById('spatialTagPeople').className = "radio-toolbar";
            this.subject = 'vehicles';
        }
        else if (this.currentSpatialTag == "people"){
            document.getElementById('spatialTagPeople').className = "radioclicked";
            document.getElementById('spatialTagVehicles').className = "radio-toolbar";
            this.subject = 'people';
        }

        // Use Case
        if (this.currentSpatialTag == "counting") {
            document.getElementById('spatialTagCounting').className = "radioclicked";
            document.getElementById('spatialTagTracking').className = "radio-toolbar";
            document.getElementById('spatialTagDetection').className = "radio-toolbar";
            this.useCase = 'counting';
        }
        else if (this.currentSpatialTag == "tracking") {
            document.getElementById('spatialTagTracking').className = "radioclicked";
            document.getElementById('spatialTagCounting').className = "radio-toolbar";
            document.getElementById('spatialTagDetection').className = "radio-toolbar";
            this.useCase = 'tracking';
        }
        else if (this.currentSpatialTag == "detection") {
            document.getElementById('spatialTagCounting').className = "radio-toolbar";
            document.getElementById('spatialTagTracking').className = "radio-toolbar";
            document.getElementById('spatialTagDetection').className = "radioclicked";
            this.useCase = 'detection';
        }

        //Camera Location
        if (this.currentSpatialTag == "side") {
            document.getElementById('spatialTagSide').className = "radioclicked";
            document.getElementById('spatialTagCorner').className = "radio-toolbar";
        }
        else if (this.currentSpatialTag == "corner"){
            document.getElementById('spatialTagCorner').className = "radioclicked";
            document.getElementById('spatialTagSide').className = "radio-toolbar";
        }

        //View point
        if (this.currentSpatialTag == "left") {
            document.getElementById('spatialTagLeft').className = "radioclicked";
            document.getElementById('spatialTagRight').className = "radio-toolbar";
            document.getElementById('spatialTagFront').className = "radio-toolbar";
            document.getElementById('spatialTagBack').className = "radio-toolbar";}
        else if (this.currentSpatialTag == "right") {
            document.getElementById('spatialTagLeft').className = "radio-toolbar";
            document.getElementById('spatialTagRight').className = "radioclicked";
            document.getElementById('spatialTagFront').className = "radio-toolbar";
            document.getElementById('spatialTagBack').className = "radio-toolbar";}
        else if (this.currentSpatialTag == "front") {
            document.getElementById('spatialTagLeft').className = "radio-toolbar";
            document.getElementById('spatialTagRight').className = "radio-toolbar";
            document.getElementById('spatialTagFront').className = "radioclicked";
            document.getElementById('spatialTagBack').className = "radio-toolbar";}
        else if (this.currentSpatialTag == "back") {
            document.getElementById('spatialTagLeft').className = "radio-toolbar";
            document.getElementById('spatialTagRight').className = "radio-toolbar";
            document.getElementById('spatialTagFront').className = "radio-toolbar";
            document.getElementById('spatialTagBack').className = "radioclicked";}


            this.updateGlobalAttributesModal();
    }

    private fetchAttributeForCurrentFrame = (frame_num: number): void => {
        // console.log('fetch global attributes for ', frame_num);
        // this.globalAttributes = {};
        // this.globalAttributesSelected = {};
        for (let globalAttributes of this.globalAttributesDB) {
            if (frame_num >= globalAttributes['frame_start'] && frame_num <= globalAttributes['frame_end']) {
                // this.globalAttributes = globalAttributes['attributes']; //checking
                // console.log('attribute found: ',this.globalAttributes);
            } else {
                // console.log('attributes not found for', frame_num, 'in', globalAttributes);
            }
        }
        for (let globalAttributesSelected of this.globalAttributesSelectedDB) {
            if (frame_num >= parseInt(globalAttributesSelected['frame_start']) && frame_num <= parseInt(globalAttributesSelected['frame_end'])) {
                this.globalAttributesSelected = globalAttributesSelected['attributes'];
                // console.log('selected found: ',this.globalAttributesSelected);
            } else {
                // console.log('attributes not found for', frame_num, 'in', globalAttributesSelected);
            }
        }
        // console.log('attributes db', this.globalAttributesDB);
        // console.log('selected db',this.globalAttributesSelectedDB);
        // console.log(this.globalAttributes)
        // console.log(this.globalAttributesSelected);
        this.onEditGlobalAttributes();
    }

    private handleOk = (event:any): void => {
        this.firstTime = false;
        const {jobInstance,onEditLabels} = this.props;
        // console.log(jobInstance);

        // let data = JSON.stringify(jobInstance.task.labels);
        // console.log(data);
        // console.log('handleOk',this.globalAttributes);
        let attributesLength = Object.keys(this.globalAttributes).length;
        let currentLength = Object.keys(this.globalAttributesSelected).length;
        let hasEmptyValues = false;
        let new_frame_start = parseInt((document.getElementById('frame_start') as (HTMLInputElement)).value);
        let new_frame_end = parseInt((document.getElementById('frame_end') as (HTMLInputElement)).value);
        // console.log(new_frame_start,new_frame_end);

        let globalAttributesWithFrameRange: any = {};
        let globalAttributesSelectedWithFrameRange: any = {};



        for (let key in this.globalAttributesSelected) {
            if (this.globalAttributesSelected[key] === "" || this.globalAttributesSelected[key] === null) {
                hasEmptyValues = true;
            }
        }

        //check if the form is valid
        let valid_range = new_frame_start >= 0 && new_frame_end <= jobInstance.stopFrame && new_frame_end >= 0 && new_frame_end >= new_frame_start;
        if (attributesLength == currentLength && !hasEmptyValues && valid_range) {//dont forget to add check for valid_range
            onEditLabels(jobInstance,{...this.globalAttributes},{...this.globalAttributesSelected});//send a copy to the server, not the original data
            this.frame_start = new_frame_start;
            this.frame_end = new_frame_end;
            globalAttributesSelectedWithFrameRange = {
                frame_start: new_frame_start,
                frame_end: new_frame_end,
                attributes: this.globalAttributesSelected,
            }
            globalAttributesWithFrameRange = {
                frame_start: new_frame_start,
                frame_end: new_frame_end,
                attributes: this.globalAttributes,
            }
            this.globalAttributesSelectedDB.push(globalAttributesSelectedWithFrameRange);
            this.globalAttributesDB.push(globalAttributesWithFrameRange);
            // console.log('Attributes DB', this.globalAttributesDB);
            // console.log('Selected DB', this.globalAttributesSelectedDB);

            // if form is valid, close the modal
            this.globalAttributesModal.update({
                visible: false
            });
            this.onEditGlobalAttributes();
        } else {
                console.log('Attributes:',this.globalAttributes);
                console.log('Selected:',this.globalAttributesSelected);
                console.log('Attributes length:',attributesLength);
                console.log('Selected length:',currentLength);
                console.log('Valid range:',valid_range);
                console.log('hasEmptyValues:',hasEmptyValues);

            if (attributesLength > currentLength || (hasEmptyValues || currentLength == 0)) {
                notification.error({
                    message: 'Could not change global attributes',
                    description: 'Some attributes are not selected.',
                });
            } else if (!valid_range) {
                notification.error({
                    message: 'Could not change global attributes',
                    description: `Choose frame range from 0 to ${jobInstance.stopFrame}`,
                });
            } else {
                notification.error({
                    message: 'Unknown error',
                    description: 'Check console for more details.',
                });
            }
        }
        this.addAttribute = false;
        if(this.requireReload){
            notification.error({
                message: 'Reload required',
                description: 'For the new attributes to reflect. Please save your work and reload the page. ',
            });
        }
        // console.log('Ok button pressed');
    }

    private handleCancel = (event: any): void => {
        // this.globalAttributesSelected = {};

        this.updateGlobalAttributesModal();
        this.globalAttributesModal.update({
            visible: false
        });

        // console.log('cancel');
    }
    private handleSelectAttribute = (attribute: any, index: any, event:any): void => {
        this.updateDropDown();

        // console.log('attribute',attribute);
        // console.log(index);
        // //var x = document.getElementById('SelectAttribute'+attribute);
        // console.log('event.label',event.label);
        // console.log(this.globalAttributes);
        // console.log('AllAttributes',this.AllAttributes);
        // console.log('AllAttributeNames',this.AllAttributeNames);
        // console.log('dropdownEntries',this.dropdownEntries);


        if(index == -1){
            //index == -1 means Other is selected
            // console.log('Other selected');
            let result = prompt("Input new attribute (maximum of 5 only)");
            if (result != null) {
                this.globalAttributes[result] = [];
                this.globalAttributesSelected[result] = "";
            }
            this.addAttribute = false; // remove the drop down
        }else{

            var ObjectOrder = Object.keys(this.globalAttributes);
            // console.log(ObjectOrder, 'FRESH');
            // console.log(ObjectOrder.indexOf(attribute));

            if (ObjectOrder.indexOf(attribute)>-1){ // check if attribute does not exist in the current global attribute list
                ObjectOrder[ObjectOrder.indexOf(attribute)] = event.label;
            }
            else { // if it exists
                ObjectOrder.push(event.label);
            }
            ObjectOrder =  Array.from(new Set(ObjectOrder));
            // console.log(ObjectOrder, 'NEW');
            if (event.label!==attribute && this.AllAttributes[event.label]){
                // if the selected attribute in dropdown already exists in global attributes
                this.globalAttributes[event.label] = this.AllAttributes[event.label];
                delete this.globalAttributes[attribute];
            }else{
                this.addAttribute = false;
            }
            if (event.label!==attribute && !this.AllAttributes[event.label]){
                // if the selected attribute in dropdown does NOT EXIST in global attributes
                delete this.globalAttributes[attribute];
                this.globalAttributes[event.label] = [];
                for(const key in this.dropDownAttributes){
                    // search for the choices of the attribute from this.dropDownAttributes
                    // console.log('key',key);

                    for(const attribute of this.dropDownAttributes[key]){
                        console.log(attribute.name);
                        if(attribute.name == event.label){
                            console.log('FOUND',attribute.value);
                            this.globalAttributes[event.label] = attribute.value;
                        }
                    }

                }
            }
            else{
                this.globalAttributes[event.label] = [];
            }

            this.globalAttributes = this.preferredOrder(this.globalAttributes,Array.from(new Set(ObjectOrder)));

        }


        this.updateSelectedAttributeValues(0);
        this.updateGlobalAttributesModal();
    }

    private updateSelectedAttributeValues = (value: any): void => {
        for (const key in this.globalAttributes) {
            if (this.AllAttributes[key]) {
                this.globalAttributes[key] = this.AllAttributes[key];
                if(this.currentSpatialTag=='open'){
                    if(this.globalAttributes.hasOwnProperty('Lighting')){
                        this.globalAttributes['Lighting'] = ['Daylight', 'Night', 'Sunrise/Sunset', 'Dawn/Dusk', 'Noon/Midday'];
                    }
                    if(this.globalAttributes.hasOwnProperty('Weather')){
                        this.globalAttributes['Weather'] = ['Sunny/Direct Sun', 'Clouds/Overcast', 'Fog/Haze', 'Rain', 'Snow'];
                    }
                    if(this.globalAttributes.hasOwnProperty('Surface Property')){
                        this.globalAttributes['Surface Property'] = ['Dry', 'Moist/Muddy', 'Ice/Frost'];
                    }
                    if(this.globalAttributes.hasOwnProperty('Seasons')){
                        this.globalAttributes['Seasons'] = ['Spring', 'Summer', 'Autumn', 'Winter'];
                    }
                    if(this.globalAttributes.hasOwnProperty('Additional Attributes')){
                        this.globalAttributes['Additional Attributes'] = ['Active/Busy', 'Rugged', 'Cluttered'];
                    }
                }
                if(this.currentSpatialTag=='enclosed'){
                    if(this.globalAttributes.hasOwnProperty('Lighting')){
                        this.globalAttributes['Lighting'] = ['Ambient Lighting', 'Low Illumination', 'Single Light Source', 'Object Illumination', 'Multiple Light Sources', 'Screen Illumination', 'Window', 'Tinted'];
                    }
                    if(this.globalAttributes.hasOwnProperty('Surface Property')){
                        this.globalAttributes['Surface Property'] = ['Glossy', 'Matte', 'Damp/Moist', 'Rusty'];
                    }
                }
            }
        }
    }
    private preferredOrder(obj: any[], order: any[]) {
        var newObject = [];
        for(var i = 0; i < order.length; i++) {
            if(obj.hasOwnProperty(order[i])) {
                newObject[order[i]] = obj[order[i]];
            }
            this.updateGlobalAttributesModal();
        }
        return newObject;
    }

    private handleAddAttributeValue = (event: any): void => {
        let num_keys = Object.keys(this.globalAttributes).length;
        // console.log(num_keys)
        // if(num_keys>=5){
        //     alert('You cannot add more than 5 global attributes');
        // } else {
            // let result = prompt("Input new attribute (maximum of 5 only)");
            // if (result != null) {
            //     this.globalAttributes[result] = [];
            // }
            this.addAttribute = true;
            this.updateGlobalAttributesModal();
        // }
    }
    private onMouseOver = (value: any): void => {
        // console.log('mouse over on ',value);
        var xBtn = document.getElementById('xBtn' + value);
        if (xBtn != null && this.firstTime){
            xBtn.style.display = "block";
        }
        if (xBtn != null && !this.firstTime){
            xBtn.style.display = "none";
        }
    }
    private onMouseOut = (value: any): void => {
        // console.log('mouse out on ', value);
        var xBtn = document.getElementById('xBtn' + value);
        if (xBtn != null)
            xBtn.style.display = "none";
    }
    private handleDeleteChoice(key: string, value: string) {
        // console.log(this.globalAttributes[key]);
        if(key==value){
            // console.log('must be an attribute');
            delete this.globalAttributes[key];
        } else {
            for (var i = 0; i < this.globalAttributes[key].length; i++) {
                if (this.globalAttributes[key][i] === value) {
                    this.globalAttributes[key].splice(i, 1);
                }
                if (this.globalAttributesSelected[key] === value) {
                    this.globalAttributesSelected[key] = "";
                }
            }
        }

        this.updateGlobalAttributesModal();
        this.onEditGlobalAttributes();
    }
    private generateElements = (): any[] => {
        const items: any[] = [];
        const { jobInstance } = this.props;
        items.push(
            <div className="radio-frame">
                <input id='frame_start' type="number" size="small" min="0" max="10000" /><Text> to: </Text>
                <input id='frame_end' type="number" size="small" min="0" max="10000" />
                <button
                    className="plusbutton"
                    onClick={(event) => this.handleAddAttributeValue(event)}>+</button>
                <button
                    className="xbutton"
                    onClick={(event) => this.handleCancel(event)}>X</button>
            </div>,
            <div></div>
        );

        items.push(
            <Row gutter={[12]} >
                <Col span={8} className="Properties-header">
                    Subjects

                <Col>
                        <button onClick={() => this.changeSpatialTag('vehicles')} className="radio-toolbar" id="spatialTagVehicles"> Vehicles </button>
                        <button onClick={() => this.changeSpatialTag('people')} className="radio-toolbar" id="spatialTagPeople"> People </button>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Use Case

                <Col>
                        <button onClick={() => this.changeSpatialTag('counting')} className="radio-toolbar" id="spatialTagCounting"> Counting </button>
                        <button onClick={() => this.changeSpatialTag('tracking')} className="radio-toolbar" id="spatialTagTracking"> Tracking </button>
                        <button onClick={() => this.changeSpatialTag('detection')} className="radio-toolbar" id="spatialTagDetection"> Detection </button>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Spatial Properties

                <Col>
                        <button onClick={() => this.changeSpatialTag('open')} className="radioclicked" id="spatialTagOpen"> Open area </button>
                        <button onClick={() => this.changeSpatialTag('enclosed')} className="radio-toolbar" id="spatialTagEnclosed"> Enclosed </button>

                    </Col>

                </Col>
            </Row>,

            <Row gutter={[12]} >
                <Col span={8} className="Properties-header">
                    Camera Location

                <Col>
                        <button onClick={() => this.changeSpatialTag('side')} className="radio-toolbar" id="spatialTagSide"> Side </button>
                        <button onClick={() => this.changeSpatialTag('corner')} className="radio-toolbar" id="spatialTagCorner"> Corner </button>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Camera Viewpoint Orientation

                <Col>
                        <button onClick={() => this.changeSpatialTag('left')} className="radio-toolbar" id="spatialTagLeft"> Left </button>
                        <button onClick={() => this.changeSpatialTag('right')} className="radio-toolbar" id="spatialTagRight"> Right </button>
                        <button onClick={() => this.changeSpatialTag('front')} className="radio-toolbar" id="spatialTagFront"> Front </button>
                        <button onClick={() => this.changeSpatialTag('back')} className="radio-toolbar" id="spatialTagBack"> Back </button>
                    </Col>

                </Col>

            </Row>
        )

        for (const key in this.globalAttributes) {
            const{
                jobInstance
            } =this.props;

            items.push(<div class="attribute-container" onMouseOver={event => this.onMouseOver(key)} onMouseOut={event => this.onMouseOut(key)}>
                <button type='button' class="x" id={'xBtn' + key} onClick={event => this.handleDeleteChoice(key, key)} onsubmit="return false">
                    x
                            </button>
                <Row>
                    <Text className='cvat-title' key={key}>{key}</Text>
                    <div>
                <Tooltip title='Change attribute'>
                {/* <Select
                        placeholder={key}
                        onChange={(value: SelectValue) => (
                            this.handleSelectAttribute(key,this.dropdownEntries.indexOf(value.key),value as String);
                            )}
                        labelInValue
                        id = {'SelectAttribute'+key}
                        style={{ width: 200 }}
                    >
                        {this.dropdownEntries.map((label: any,index:number): JSX.Element => (
                            <Select.Option key={index} value={`${label}`}>

                                {label}
                            </Select.Option>

                        ))

                        }
                    </Select> */}
                </Tooltip>
            </div>
                </Row>
            </div>);
            let temp = []
            for (const [index, value] of this.globalAttributes[key].entries()) {
                if (value != '+') {
                    // only enable x button for newly added choices
                    let xBtn =  <button type='button' class="x" id={'xBtn' + value} onClick={event => this.handleDeleteChoice(key, value)} onsubmit="return false">
                                x
                                </button>;
                    let choiceIndex = -1;
                    for(let attribute of jobInstance.task.labels[0].attributes){
                        if(attribute.name == key){
                            choiceIndex = attribute.values.indexOf(value);
                        }
                    }
                    if(choiceIndex == -1){
                        // choice is new
                        temp.push(
                            <div class="container" onMouseOver={event => this.onMouseOver(value)} onMouseOut={event => this.onMouseOut(value)}>
                                {xBtn}
                                <input type='radio' id={'radio' + key + 'Option' + index} key={index} name={'radio' + key} value={value}></input>
                                <label for={'radio' + key + 'Option' + index}>{value}</label>
                            </div>
                        );
                    }else{
                        temp.push(
                            <div class="container" onMouseOver={event => this.onMouseOver(value)} onMouseOut={event => this.onMouseOut(value)}>
                                <input type='radio' id={'radio' + key + 'Option' + index} key={index} name={'radio' + key} value={value}></input>
                                <label for={'radio' + key + 'Option' + index}>{value}</label>
                            </div>
                        );
                    }
                } else {

                }

            }
            temp.push(
                <div class="container" >
                    <input type='radio' id={'radio' + key + 'Option+'} key={this.globalAttributes[key].entries().length} name={'radio' + key} value={'+'}></input>
                    <label for={'radio' + key + 'Option+'} id = {'label' + key + 'Option+'}>{'+'}</label>
                    <input type="text" class="input " style={{display: 'none'}} id = {'input' + key + 'Option+'} ></input>
                </div>
            );

            items.push(<form class="radio-toolbar" onClick={event => this.onChangeOptionHandler(event.target.value, key)} onSubmit={(event: KeyboardEvent | undefined) => this.enterHandler(event,key)}>{temp}</form>);
        }
        if(this.addAttribute){
            items.push(
                <div>
                    <Tooltip title='Select an attribute'>
                    <Select
                        placeholder='Select an attribute'
                        onChange={(value: SelectValue) =>
                            {
                                // console.log(value);
                                this.handleSelectAttribute('-new',this.dropdownEntries.indexOf(value.key),value as String);
                            }
                        }
                        labelInValue
                        id = {'SelectAttribute'+"key"}
                        style={{ width: 200 }}
                    >
                        {this.dropdownEntries.map((label: any,index:number): JSX.Element|undefined => {
                            if(!this.globalAttributes[label]){
                                return (
                                    <Select.Option key={index} value={`${label}`}>

                                        {label}
                                    </Select.Option>
                                )
                            }
                        })
                        }
                        <Select.Option key={'Other'} value={'Other'}>
                            Other
                        </Select.Option>
                    </Select>
                    </Tooltip>
                </div>
            );
        }

        return items;
    }
    private onChangeFrameRangeHandler = (id: string): void => {
        let input = document.getElementById(id) as (HTMLInputElement);
        if(input != null){
            // console.log(id,input.value);
            if(input.value == 'frame_start'){
                this.frame_start = parseInt(input.value);
            } else {

            }
        }

    }
    private enterHandler = (event: KeyboardEvent,key:string) => {
        // used for getting the input in the text box created when clicking the + button
        // this function is called when the 'enter' key is pressed on a keyboard while on an input box
        let input = document.getElementById('input' + key + 'Option+');
        if(input){
            let result = input.value;//value from text box
            this.globalAttributes[key].push(result);
            this.requireReload = true;
            this.updateGlobalAttributesModal();
        }

        event.preventDefault();
    }
    private onChangeOptionHandler = (value: string, key: string): void => {
        const {jobInstance} = this.props;
        // console.log(jobInstance.task.labels[0].attributes);

        if (value) {
            if (value == '+') {
                // console.log('+ pressed');
                let origLength = 0;
                let currentLength = this.globalAttributes[key].length;
                // check if the added choices exceeds the limit (currently, the limit is 5)
                for(let attribute of jobInstance.task.labels[0].attributes){
                    if(attribute.name == key){
                        origLength = attribute.values.length;
                    }
                }

                let label = document.getElementById('label' + key + 'Option+'); // get label of the + button pressed
                let input = document.getElementById('input' + key + 'Option+'); // get the hidden input of the + button pressed
                if(currentLength - origLength <5){
                    // change the + button into an input text
                    if(label){
                        label.style.display = 'none'; // hide the label

                        if(input){
                            input.style.display = 'block';// show the input
                            input.focus();
                        }
                    }

                }else{
                    notification.error({
                        message: 'Cannot add more options.',
                        description: 'Limit exceeded. Save and reload the page or delete some attributes.',
                    });
                }

            } else {
                this.globalAttributesSelected[key] = value;
            }
        }
    }

    private updateGlobalAttributesModal = (): void => {
        let items: any = this.generateElements();
        this.globalAttributesModal.update({
            content:
                <div>{items}</div>
            ,
        });
        // this.waitPageToCompleteLoading();
    }
    // ISL Save-Popup
    private lastSavePopup = (event: any): void => {
        const {
        saving,
        onSaveAnnotation
        } = this.props;

       //let setCurrentTime = {
        //      currentTime: new Date().toLocaleTimeString('en-US', { hour12: true })
        //  }
                if(saving){
        // do nothing
        } else{
            this.onSaveAnnotation();
        }
                // console.log('calling save2' );
            }
    // ISL END

    private showGlobalAttributesModal = (): void => {
        this.globalAttributesModal.update({
            visible: true,
        });

    }

    private hideGlobalAttributesModal = (): void => {
        this.globalAttributesModal.update({
            visible: false,
        });

    }
    private waitPageToCompleteLoading = (): void => {
        // this function is required in order to override the value of the frame range inputs
        // for some reason document.getElementById('frame_start') returns null even when the modal is being shown
        // this could be because the modal is shown in asynchronously and is not using the main thread
            let frame_start = (document.getElementById('frame_start') as (HTMLInputElement));
            let frame_end = (document.getElementById('frame_end') as (HTMLInputElement));
            if(frame_start !== null && frame_end !== null){
                frame_start.value = this.frame_start + "";
                frame_end.value = this.frame_end +"";
                for(const key in this.globalAttributesSelected){
                    let index = this.globalAttributes[key].indexOf(this.globalAttributesSelected[key]);
                    let id = 'radio' + key + 'Option' + index;
                    let checkedElement = document.getElementById(id);

                    if(checkedElement){
                        checkedElement.checked = true;
                        // console.log('update selected',checkedElement.value);
                    }
                }
            }else{
                setTimeout(this.waitPageToCompleteLoading, 300);
            }
    }
    private onGlobalIconClick = (): void => {
        const {
            onSetGlobalAttributesVisibility,
        } = this.props;
        onSetGlobalAttributesVisibility(true);
        this.showGlobalAttributesModal();
        // console.log('Open Modal');
    }

    private onEditGlobalAttributes = (): void => {
        const { onEditGlobalAttributes } = this.props;
        // console.log(this.globalAttributesSelected);
        onEditGlobalAttributes(this.globalAttributesSelected);

    }
    // ISL END

    public render(): JSX.Element {
        const { nextButtonType, prevButtonType } = this.state;
        const {
            playing,
            saving,
            savingStatuses,
            job,
            jobInstance,
            jobInstance: {
                startFrame,
                stopFrame,
            },
            frameNumber,
            frameFilename,
            undoAction,
            redoAction,
            workspace,
            canvasIsReady,
            searchAnnotations,
            changeWorkspace,
            keyMap,
            normalizedKeyMap,
            canvasInstance,
            featuresToggle,
            showFeaturesToggle,
        } = this.props;

        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        const subKeyMap = {
            SAVE_JOB: keyMap.SAVE_JOB,
            UNDO: keyMap.UNDO,
            REDO: keyMap.REDO,
            NEXT_FRAME: keyMap.NEXT_FRAME,
            PREV_FRAME: keyMap.PREV_FRAME,
            FORWARD_FRAME: keyMap.FORWARD_FRAME,
            BACKWARD_FRAME: keyMap.BACKWARD_FRAME,
            SEARCH_FORWARD: keyMap.SEARCH_FORWARD,
            SEARCH_BACKWARD: keyMap.SEARCH_BACKWARD,
            PLAY_PAUSE: keyMap.PLAY_PAUSE,
            FOCUS_INPUT_FRAME: keyMap.FOCUS_INPUT_FRAME,
        };

        const handlers = {
            UNDO: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (undoAction) {
                    this.undo();
                }
            },
            REDO: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (redoAction) {
                    this.redo();
                }
            },
            SAVE_JOB: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (!saving) {
                    this.onSaveAnnotation();
                }
            },
            NEXT_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onNextFrame();
                }
            },
            PREV_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onPrevFrame();
                }
            },
            FORWARD_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onForward();
                }
            },
            BACKWARD_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (canvasIsReady) {
                    this.onBackward();
                }
            },
            SEARCH_FORWARD: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (frameNumber + 1 <= stopFrame && canvasIsReady
                    && canvasInstance.isAbleToChangeFrame()
                ) {
                    searchAnnotations(jobInstance, frameNumber + 1, stopFrame);
                }
            },
            SEARCH_BACKWARD: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (frameNumber - 1 >= startFrame && canvasIsReady
                    && canvasInstance.isAbleToChangeFrame()
                ) {
                    searchAnnotations(jobInstance, frameNumber - 1, startFrame);
                }
            },
            PLAY_PAUSE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                this.onSwitchPlay();
            },
            FOCUS_INPUT_FRAME: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                if (this.inputFrameRef.current) {
                    this.inputFrameRef.current.focus();
                }
            },
        };

        return (
            <>
                <GlobalHotKeys keyMap={subKeyMap} handlers={handlers} allowChanges />
                <AnnotationTopBarComponent
                    showStatistics={this.showStatistics}
                    onSwitchPlay={this.onSwitchPlay}
                    onSaveAnnotation={this.onSaveAnnotation}
                    onPrevFrame={this.onPrevFrame}
                    onNextFrame={this.onNextFrame}
                    onForward={this.onForward}
                    onBackward={this.onBackward}
                    onFirstFrame={this.onFirstFrame}
                    onLastFrame={this.onLastFrame}
                    setNextButtonType={this.onSetNextButtonType}
                    setPrevButtonType={this.onSetPreviousButtonType}
                    onSliderChange={this.onChangePlayerSliderValue}
                    onInputChange={this.onChangePlayerInputValue}
                    onURLIconClick={this.onURLIconClick}
                    changeWorkspace={changeWorkspace}
                    workspace={workspace}
                    playing={playing}
                    saving={saving}
                    savingStatuses={savingStatuses}
                    startFrame={startFrame}
                    stopFrame={stopFrame}
                    frameNumber={frameNumber}
                    frameFilename={frameFilename}
                    inputFrameRef={this.inputFrameRef}
                    undoAction={undoAction}
                    redoAction={redoAction}
                    saveShortcut={normalizedKeyMap.SAVE_JOB}
                    undoShortcut={normalizedKeyMap.UNDO}
                    redoShortcut={normalizedKeyMap.REDO}
                    playPauseShortcut={normalizedKeyMap.PLAY_PAUSE}
                    nextFrameShortcut={normalizedKeyMap.NEXT_FRAME}
                    previousFrameShortcut={normalizedKeyMap.PREV_FRAME}
                    forwardShortcut={normalizedKeyMap.FORWARD_FRAME}
                    backwardShortcut={normalizedKeyMap.BACKWARD_FRAME}
                    nextButtonType={nextButtonType}
                    prevButtonType={prevButtonType}
                    focusFrameInputShortcut={normalizedKeyMap.FOCUS_INPUT_FRAME}
                    onUndoClick={this.undo}
                    onRedoClick={this.redo}
                    lastSavePopup={this.lastSavePopup} // ISL Save-Popup
                    onEditGlobalAttributes={this.onEditGlobalAttributes} // ISL GLOBAL ATTRIBUTES
                    onGlobalIconClick={this.onGlobalIconClick} // ISL GLOBAL ATTRIBUTES
                    jobInstance={jobInstance} // mabe
                    // ISL FEATURES TOGGLE
                    featuresToggle={featuresToggle}
                    showFeaturesToggle={showFeaturesToggle}
                    // ISL END

                />
            </>
        );
    }
}

export default withRouter(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    )(AnnotationTopBarContainer),
);
