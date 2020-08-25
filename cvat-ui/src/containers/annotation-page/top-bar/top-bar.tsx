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
    editLabels,
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
    onEditLabels(jobInstance:any,attributes:any,selected:any):void;
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
        onEditGlobalAttributes(globalAttributes: any): void {
            dispatch(editGlobalAttributesAction(globalAttributes));
        },
        onEditLabels(jobInstance:any,attributes:any,selected:any): void {
            dispatch(editLabels(jobInstance,attributes,selected));
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
        this.hideGlobalAttributesModal();
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

        if (frameNumber != prevProps.frameNumber) {
            // TO DO: get the proper global attributes from the database and update the current one
            this.fetchAttributeForCurrentFrame(frameNumber);

        }
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
    private globalAttributesDB: any[] = [];
    private globalAttributesSelectedDB: any[] = [];
    private frame_start: number = 0;
    private frame_end: number = 0;
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

    private initiateGlobalAttributesModal = (): void => {
        const { jobInstance } = this.props;
        this.globalAttributes = {};
        this.globalAttributesSelected = {};
        let globalAttributesWithFrameRange: any = {};

        // console.log(jobInstance.task.labels[0].attributes.length);
        // console.log(jobInstance.task.labels[0].attributes);
        // console.log(jobInstance.task.labels);
        // Cycle through ALL existing attributes OF THE FIRST LABEL.
        // i < 1 or jobInstance.task.labels[0].attributes.length
        for (var i = 0; i < 1; i++) {
            // Initiate global attributes for the modal. e.g. name = 'weather', values = ['clear', 'foggy', ...]
            if (jobInstance.task.labels[0].attributes[i].inputType !== "radio") {
                this.globalAttributes[jobInstance.task.labels[0].attributes[i].name] = jobInstance.task.labels[0].attributes[i].values.slice();
            }
        }
        this.frame_start = 0;
        this.frame_end = jobInstance.stopFrame;
        globalAttributesWithFrameRange = {
            frame_start: this.frame_start,
            frame_end: jobInstance.stopFrame,
            attributes: this.globalAttributes,
        }
        this.globalAttributesDB.push(globalAttributesWithFrameRange);
        // console.log('MARKER',globalAttributesWithFrameRange['frame_start'],
        // globalAttributesWithFrameRange['frame_end'],
        // globalAttributesWithFrameRange['attributes']);
        this.updateGlobalAttributesModal();
        // console.log(this.globalAttributes);



        console.log('Initiate global attributes modal complete');
    }

    private fetchAttributeForCurrentFrame = (frame_num: number): void => {
        console.log('fetch global attributes for ', frame_num);
        this.globalAttributes = {};
        this.globalAttributesSelected = {};
        for (let globalAttributes of this.globalAttributesDB) {
            if (frame_num >= globalAttributes['frame_start'] && frame_num <= globalAttributes['frame_end']) {
                this.globalAttributes = globalAttributes['attributes'];
            } else {
                console.log('attributes not found for', frame_num, 'in', globalAttributes);
            }
        }
        for (let globalAttributesSelected of this.globalAttributesSelectedDB) {
            if (frame_num >= parseInt(globalAttributesSelected['frame_start']) && frame_num <= parseInt(globalAttributesSelected['frame_end'])) {
                this.globalAttributesSelected = globalAttributesSelected['attributes'];
            }
        }
        // console.log('attributes db', this.globalAttributesDB);
        // console.log('selected db',this.globalAttributesSelectedDB);
        // console.log(this.globalAttributes)
        // console.log(this.globalAttributesSelected);
        this.onEditGlobalAttributes();
    }

    private handleOk = (event:any): void => {

        const {jobInstance,onEditLabels} = this.props;
        // console.log(jobInstance);

        // let data = JSON.stringify(jobInstance.task.labels);
        // console.log(data);

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

        let valid_range = new_frame_start >= 0 && new_frame_end < jobInstance.stopFrame && new_frame_end >= 0 && new_frame_end >= new_frame_start;
        if (attributesLength == currentLength && !hasEmptyValues) {//dont forget to add check for valid_range
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
            if (attributesLength != currentLength && (hasEmptyValues || currentLength == 0)) {
                alert('Some attributes were not selected!');
            } else if (!valid_range) {
                alert('Invalid frame range')
            } else {
                console.log('Attributes:',this.globalAttributes);
                console.log('Selected:',this.globalAttributesSelected);
                console.log('Attributes length:',attributesLength);
                console.log('Selected length:',currentLength);
                console.log('Valid range:',valid_range);
                console.log('hasEmptyValues:',hasEmptyValues);
                alert('Unknown Error! Check console for more details');
            }
        }
        // console.log('Ok button pressed');
    }

    private handleCancel = (event: any): void => {
        this.globalAttributesSelected = {};
        this.globalAttributesModal.update({
            visible: false
        });
        // console.log('cancel');
    }
    private handleSelectAttribute = (event: any): void => {
        let num_keys = Object.keys(this.globalAttributes).length;
        // console.log(num_keys)
        if (num_keys >= 5) {
            alert('You cannot add more than 5 global attributes');
        } else {
            let result = prompt("Input new attribute (maximum of 5 only)");
            if (result != null) {
                this.globalAttributes[result] = [];
            }
            this.updateGlobalAttributesModal();
        }
    }
    private handleAddAttributeValue = (event: any): void => {
        let num_keys = Object.keys(this.globalAttributes).length;
        // console.log(num_keys)
        if(num_keys>=5){
            alert('You cannot add more than 5 global attributes');
        } else {
            let result = prompt("Input new attribute (maximum of 5 only)");
            if (result != null) {
                this.globalAttributes[result] = [];
            }
            this.updateGlobalAttributesModal();
        }
    }
    private onMouseOver = (value: any): void => {
        // console.log('mouse over on ',value);
        var xBtn = document.getElementById('xBtn' + value);
        if (xBtn != null)
            xBtn.style.display = "block";
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
                <input id='frame_start' type="number" size="small" min="0" max="10000" /><text> to: </text>
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
                        <button onClick={() => console.log("Vehicles clicked!")} className="radio-toolbar"> Vehicles </button>
                        <utton onClick={() => console.log("b clicked!")} className="radio-toolbar"> People </utton>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Use Case

                <Col>
                        <button onClick={() => console.log("counting clicked!")} className="radio-toolbar"> Counting </button>
                        <button onClick={() => console.log("tracking clicked!")} className="radio-toolbar"> Tracking </button>
                        <button onClick={() => console.log("detection clicked!")} className="radio-toolbar"> Detection </button>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Spatial Properties

                <Col>
                        <button onClick={() => console.log("open clicked!")} className="radio-toolbar"> Open area </button>
                        <button onClick={() => console.log("encolsed clicked!")} className="radio-toolbar"> Enclosed </button>

                    </Col>

                </Col>
            </Row>,

            <Row gutter={[12]} >
                <Col span={8} className="Properties-header">
                    Camera Location

                <Col>
                        <button onClick={() => console.log("Vehicles clicked!")} className="radio-toolbar"> Side </button>
                        <button onClick={() => console.log("b clicked!")} className="radio-toolbar"> Corner </button>
                    </Col>

                </Col>
                <Col span={8} className="Properties-header">
                    Camera Viewpoint Orientation

                <Col>
                        <button onClick={() => console.log("counting clicked!")} className="radio-toolbar"> Left </button>
                        <button onClick={() => console.log("tracking clicked!")} className="radio-toolbar"> Right </button>
                        <button onClick={() => console.log("detection clicked!")} className="radio-toolbar"> Front </button>
                        <button onClick={() => console.log("detection clicked!")} className="radio-toolbar"> Back </button>
                    </Col>

                </Col>

            </Row>
        )
            // 24 AUG 2020
        for (const key in this.globalAttributes) {
            // console.log('this', this.globalAttributes);
            // console.log('key', key);
            items.push(<div class="attribute-container" onMouseOver={event => this.onMouseOver(key)} onMouseOut={event => this.onMouseOut(key)}>
                <button type='button' class="x" id={'xBtn' + key} onClick={event => this.handleDeleteChoice(key, key)} onsubmit="return false">
                    x
                            </button>
                <Row>
                    <Text className='cvat-title'>{key}</Text>
                    <div>
                <Tooltip title='Change attribute'>
                    <Select size='default' value={key} onChange={this.handleSelectAttribute}>
                        {Object.keys(this.globalAttributes).map((label: any): JSX.Element => (
                            <Select.Option key={label} value={`${label}`}>

                                {label}
                            </Select.Option>
                        ))}
                    </Select>
                </Tooltip>
            </div>
                </Row>
            </div>);
            let temp = []
            for (const [index, value] of this.globalAttributes[key].entries()) {
                if (value != '+') {
                    temp.push(
                        <div class="container" onMouseOver={event => this.onMouseOver(value)} onMouseOut={event => this.onMouseOut(value)}>
                            <button type='button' class="x" id={'xBtn' + value} onClick={event => this.handleDeleteChoice(key, value)} onsubmit="return false">
                                x
                            </button>
                            <input type='radio' id={'radio' + key + 'Option' + index} key={index} name={'radio' + key} value={value}></input>
                            <label for={'radio' + key + 'Option' + index}>{value}</label>
                        </div>
                    );
                } else {

                }

            }
            temp.push(
                <div class="container" >
                    <input type='radio' id={'radio' + key + 'Option+'} key={this.globalAttributes[key].entries().length} name={'radio' + key} value={'+'}></input>
                    <label for={'radio' + key + 'Option+'}>{'+'}</label>
                </div>
            );

            items.push(<form class="radio-toolbar" onClick={event => this.onChangeOptionHandler(event.target.value, key)}>{temp}</form>);
        }
        items.push(
            <div>
                <Tooltip title='Change attribute'>
                    <Select size='default' value={this.globalAttributes[0]} onChange={this.handleSelectAttribute}>
                        {Object.keys(this.globalAttributes).map((label: any): JSX.Element => (
                            <Select.Option key={label} value={`${label}`}>
                                {label}
                            </Select.Option>
                        ))}
                    </Select>
                </Tooltip>
            </div>
        );
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
    private onChangeOptionHandler = (value: string, key: string): void => {
        if (value) {
            if (value == '+') {
                let result = prompt("Input new option");
                this.globalAttributes[key].push(result);

                //call update
                // console.log(this.globalAttributes[key]);
                this.updateGlobalAttributesModal();

            } else {
                this.globalAttributesSelected[key] = value;
            }
        }
        // console.log(this.globalAttributesSelected);
    }

    private updateGlobalAttributesModal = (): void => {
        // console.log('update modal');
        let items: any = this.generateElements();
        this.globalAttributesModal.update({
            content:
                <div>{items}</div>
            ,

        });

    }

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
            let frame_start = (document.getElementById('frame_start') as (HTMLInputElement));
            let frame_end = (document.getElementById('frame_end') as (HTMLInputElement));
            if(frame_start !== null && frame_end !== null){
                frame_start.value = this.frame_start + "";
                frame_end.value = this.frame_end +"";
            }else{
                setTimeout(this.waitPageToCompleteLoading, 300);
            }
    }
    private onGlobalIconClick = (): void => {
        // console.log('click');
        this.updateGlobalAttributesModal();

        this.showGlobalAttributesModal();


        this.waitPageToCompleteLoading();
    }

    private onEditGlobalAttributes = (): void => {
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
