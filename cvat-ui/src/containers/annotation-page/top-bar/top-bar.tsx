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
import Select from 'antd/lib/select';
import Tooltip from 'antd/lib/tooltip';
// ISL END

import {
    changeFrameAsync,
    switchPlay,
    saveAnnotationsAsync,
    collectStatisticsAsync,
    showStatistics as showStatisticsAction,
    undoActionAsync,
    redoActionAsync,
    searchAnnotationsAsync,
    changeWorkspace as changeWorkspaceAction,
    activateObject,
    switchTracking, // EDITED FOR USER STORY 12/13
    closeJob as closeJobAction,
    // ISL GLOBAL ATTRIBUTES
    editGlobalAttributes as editGlobalAttributesAction,
    editGlobalAttributes,
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
    attrInputType: string;
    attrValues: string[];
    attrValue: string;
    attrName: string;
    attrID: number;
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
}

interface DispatchToProps {
    onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onSwitchPlay(playing: boolean): void;
    onSaveAnnotation(sessionInstance: any): void;
    showStatistics(sessionInstance: any): void;
    undo(sessionInstance: any, frameNumber: any): void;
    redo(sessionInstance: any, frameNumber: any): void;
    searchAnnotations(sessionInstance: any, frameFrom: any, frameTo: any): void;
    changeWorkspace(workspace: Workspace): void;
    closeJob(): void;
    onEditGlobalAttributes(globalAttributes:any): void;
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
        searchAnnotations(sessionInstance: any, frameFrom: any, frameTo: any): void {
            dispatch(searchAnnotationsAsync(sessionInstance, frameFrom, frameTo));
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(activateObject(null, null));
            dispatch(changeWorkspaceAction(workspace));
        },
        closeJob(): void {
            dispatch(closeJobAction());
        },
        onEditGlobalAttributes(globalAttributes:any): void {
            dispatch(editGlobalAttributesAction(globalAttributes));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;
class AnnotationTopBarContainer extends React.PureComponent<Props> {
    private inputFrameRef: React.RefObject<InputNumber>;
    private autoSaveInterval: number | undefined;
    private unblock: any;

    constructor(props: Props) {
        super(props);
        this.inputFrameRef = React.createRef<InputNumber>();
        this.initiateGlobalAttributesModal(); // ISL GLOBAL ATTRIBUTES
    }

    public componentDidMount(): void {
        const {
            autoSaveInterval,
            history,
            jobInstance,
        } = this.props;

        this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);

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
        this.globalAttributesModal.update(
            {visible:false});
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
        } = this.props;

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
    }

    public componentWillUnmount(): void {
        const { closeJob } = this.props;
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
        closeJob();
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
        const {
            jobInstance,
            showStatistics,
        } = this.props;

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
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .max(jobInstance.startFrame, frameNumber - 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onNextFrame = (): void => {
        const {
            frameNumber,
            jobInstance,
            playing,
            onSwitchPlay,
        } = this.props;

        const newFrame = Math
            .min(jobInstance.stopFrame, frameNumber + 1);
        if (newFrame !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
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

    private onSaveAnnotation = (): void => {
        const {
            onSaveAnnotation,
            jobInstance,
        } = this.props;

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
        const {
            onSwitchPlay,
            playing,
            frameNumber,
        } = this.props;

        if (value !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(value);
        }
    };

    private onURLIconClick = (): void => {
        const { frameNumber } = this.props;
        const {
            origin,
            pathname,
        } = window.location;
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

    private globalAttributesModal = Modal.confirm({
        title: <Text className = 'cvat-title'>Global Attributes</Text>,
        visible: true ,
        content: ( <div></div>),
        width: 800,
        okText:'Submit',
        icon:'',
        okButtonProps: {
            style: {
                width: '100px',
            },
        },

        cancelText:'Cancel',
        cancelButtonProps: {
            style: {
                width: '100px',
            },
        },
        onOk:(event) => this.handleOk(event),
        onCancel:(event) => this.handleCancel(event),
    });

    private initiateGlobalAttributesModal = (event: any):void =>{
        const { jobInstance } = this.props;
        this.globalAttributes = {};
        this.globalAttributesSelected = {};
        // Cycle through ALL existing attributes OF THE FIRST LABEL.
        for (var i = 0; i < jobInstance.task.labels[0].attributes.length; i++) {
            // Initiate global attributes for the modal. e.g. name = 'weather', values = ['clear', 'foggy', ...]
            if(jobInstance.task.labels[0].attributes[i].inputType !== "radio"){
                this.globalAttributes[jobInstance.task.labels[0].attributes[i].name] = jobInstance.task.labels[0].attributes[i].values.slice();
            }
        }
        this.updateGlobalAttributesModal();
        // console.log('initiate global attributes modal');
        // console.log(this.globalAttributes);
    }

    private handleOk = (event:any): void => {
        let attributesLength = Object.keys(this.globalAttributes).length;
        let currentLength = Object.keys(this.globalAttributesSelected).length;
        let hasEmptyValues = false;
        for (let key in this.globalAttributesSelected){
            if(this.globalAttributesSelected[key] === ""){
                hasEmptyValues = true;
            }
        }
        //check for empty values
        if(attributesLength == currentLength && !hasEmptyValues){
            //form is valid, close the modal
            // console.log('valid');
            this.globalAttributesModal.update({
                visible :false});
            this.onEditGlobalAttributes();
        }else{
            alert('Some attributes were not selected!');
        }
        // console.log('Ok button pressed');
    }

    private handleCancel = (event:any): void => {
        this.globalAttributesSelected = {};
        this.globalAttributesModal.update({
            visible :false});
        // console.log('cancel');
    }
    private handleSelectAttribute = (event:any): void => {
        let num_keys = Object.keys(this.globalAttributes).length;
        console.log(num_keys)
        if(num_keys>=5){
            alert('You cannot add more than 5 global attributes');
        }else{
        let result = prompt("Input new attribute (maximum of 5 only)");
        if(result != null){
            this.globalAttributes[result] = [];
        }
        this.updateGlobalAttributesModal();
        }
    }
    private handleAddAttributeValue = (event:any): void => {
        let num_keys = Object.keys(this.globalAttributes).length;
        console.log(num_keys)
        if(num_keys>=5){
            alert('You cannot add more than 5 global attributes');
        }else{
        let result = prompt("Input new attribute (maximum of 5 only)");
        if(result != null){
            this.globalAttributes[result] = [];
        }
        this.updateGlobalAttributesModal();
        }
    }
    private onMouseOver = (value:any):void =>{
        // console.log('mouse over on ',value);
        var xBtn = document.getElementById('xBtn'+value);
        if(xBtn != null)
        xBtn.style.display = "block";
    }
    private onMouseOut = (value:any):void =>{
        // console.log('mouse out on ', value);
        var xBtn = document.getElementById('xBtn'+value);
        if(xBtn != null)
        xBtn.style.display = "none";
    }
    private handleDeleteChoice(key:string,value:string){
        // console.log(this.globalAttributes[key]);
        if(key==value){
            console.log('must be an attribute');
            delete this.globalAttributes[key];
        }else{
            for (var i = 0; i < this.globalAttributes[key].length; i++) {
                if(this.globalAttributes[key][i] === value){
                    this.globalAttributes[key].splice(i, 1);
                }
                if(this.globalAttributesSelected[key] === value){
                    this.globalAttributesSelected[key] = "";
                }
            }
        }

        this.updateGlobalAttributesModal();
        this.onEditGlobalAttributes();
    }
    private generateElements = (): any[] => {
        const items:any[] = [];

        items.push(

        <div className="radio-frame">
            <InputNumber  size="small" min={0} max={1000000} defaultValue={0} /><text> to: </text>
            <InputNumber  size="small" min={0} max={1000000} defaultValue={0} />
            <button
             className="plusbutton"
             onClick ={(event) => this.handleAddAttributeValue(event)}>+</button>
            <button
             className="xbutton"
             onClick ={(event) => this.handleCancel(event)}>X</button>
        </div>,
        <div></div>
        );

        items.push(
            <Row gutter={[12]} >
            <Col span={8} className ="Properties-header">
              Subjects

                <Col>
                <Button onClick={() => console.log("Vehicles clicked!")} className="fillerbuttons"> Vehicles </Button>
                <Button onClick={() => console.log("b clicked!")} className="fillerbuttons"> People </Button>
                </Col>

            </Col>
            <Col span={8} className ="Properties-header">
              Use Case

                <Col>
                <Button onClick={() => console.log("counting clicked!")} className="fillerbuttons"> Counting </Button>
                <Button onClick={() => console.log("tracking clicked!")} className="fillerbuttons"> Tracking </Button>
                <Button onClick={() => console.log("detection clicked!")} className="fillerbuttons"> Detection </Button>
                </Col>

            </Col>
            <Col span={8} className ="Properties-header">
              Spatial Properties

                <Col>
                <Button onClick={() => console.log("open clicked!")} className="fillerbuttons"> Open area </Button>
                <Button onClick={() => console.log("encolsed clicked!")} className="fillerbuttons"> Enclosed </Button>

                </Col>

            </Col>
          </Row>
        )

        for (const key in this.globalAttributes){
            items.push(<div class="attribute-container" onMouseOver={event=> this.onMouseOver(key)} onMouseOut={event => this.onMouseOut(key)}>
                            <button type='button' class="x" id={'xBtn'+key} onClick={event=> this.handleDeleteChoice(key,key)} onsubmit="return false">
                                x
                            </button>
                            <Row>
                                <Text className='cvat-title'>{key}</Text>
                                {/* ISL GLOBAL ATTRIBUTES */}
                                <div>
                                <Tooltip title='Change current label'>
                                    <Select size='small' value={`${this.globalAttributes}`} onChange={this.handleSelectAttribute}>
                                            {/* <Select.Option key={this.globalAttributes} value={`${this.globalAttributes}`}>
                                                {this.globalAttributes}
                                            </Select.Option> */}
                                    </Select>
                                </Tooltip>
                                </div>
                                {/* ISL END */}
                            </Row>
                        </div>);
            let temp = []
            for (const [index, value] of this.globalAttributes[key].entries()) {
                if(value != '+'){
                    temp.push(
                        <div class="container" onMouseOver={event=> this.onMouseOver(value)} onMouseOut={event => this.onMouseOut(value)}>
                            <button type='button' class="x" id={'xBtn'+value} onClick={event=> this.handleDeleteChoice(key,value)} onsubmit="return false">
                                x
                            </button>
                            <input type='radio' id={'radio'+key+'Option'+index} key={index} name={'radio'+key} value={value}></input>
                            <label for={'radio'+key+'Option'+index}>{value}</label>
                        </div>
                        );
                }else{

                }

            }
            temp.push(
                <div class="container" >
                    <input type='radio' id={'radio'+key+'Option+'} key={this.globalAttributes[key].entries().length} name={'radio'+key} value={'+'}></input>
                    <label for={'radio'+key+'Option+'}>{'+'}</label>
                </div>
                );
            items.push(<form class="radio-toolbar" onClick={event => this.onChangeHandler(event.target.value,key)}>{temp}</form>);
        }

        return items;
    }

    private onChangeHandler = (value:string,key:string):void =>{
        if(value){
            if(value == '+'){
                let result = prompt("Input new option");
                this.globalAttributes[key].push(result);

                //call update
                // console.log(this.globalAttributes[key]);
                this.updateGlobalAttributesModal();

            }else{
                this.globalAttributesSelected[key] = value;
            }
        }
        // console.log(this.globalAttributesSelected);
    }

    private updateGlobalAttributesModal = (): void => {
        // console.log('update modal');
        // console.log(this.globalAttributes);
        let items:any = this.generateElements();
        this.globalAttributesModal.update({
            content:
                <div>{items}</div>
                ,

        });

    }

    private showGlobalAttributesModal = ():void => {
        this.globalAttributesModal.update({
            visible:true,
        });
    }

    private onGlobalIconClick = (): void => {
        // console.log('click');
        this.showGlobalAttributesModal();
    }

    private onEditGlobalAttributes = (): void => {
        // console.log('click from top-bar.tsx');
        const { onEditGlobalAttributes } = this.props;
        // console.log(this.globalAttributesSelected);
        onEditGlobalAttributes(this.globalAttributesSelected);
    }
    // ISL END

    public render(): JSX.Element {
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
                    focusFrameInputShortcut={normalizedKeyMap.FOCUS_INPUT_FRAME}
                    onUndoClick={this.undo}
                    onRedoClick={this.redo}
                    onEditGlobalAttributes={this.onEditGlobalAttributes} // ISL GLOBAL ATTRIBUTES
                    onGlobalIconClick={this.onGlobalIconClick}

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
