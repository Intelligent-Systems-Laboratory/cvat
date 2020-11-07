// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
// ISL TRACKING
// this file controls the logic and data of the modal that appears when the tracking shortcut 'y' is pressed
import React from 'react';
import { connect } from 'react-redux';

import {
    propagateObject as propagateObjectAction,
    changePropagateFrames as changePropagateFramesAction,
    propagateObjectAsync,
    switchTrackModalVisibility,
    changeNumFramesToTrack,
    switchAutoTrack,
    previousTrack,
    editLastTrackState,
    switchTrackAllModal,
    fetch,
    changeNumFramesToTrackAll
} from 'actions/annotation-actions';

import { CombinedState } from 'reducers/interfaces';
import TrackAllConfirmComponent from 'components/annotation-page/standard-workspace/trackall-confirm';

interface StateToProps {
    visible: boolean,
    framesToTrack: number,
    results: any[],
    frameStart: number,
    sourceStates: any[],
    preview: any,
    trackingStatus:boolean,
    jobInstance: any,
    annotations:any[],
    frame:number,
}

interface DispatchToProps {
    cancel(): void;
    propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void;
    onChangeNumFramesToTrack(frames: number): void;
    onPrevious():void;
    onEditLastTrackState(drag:any,resize:any): void;
    trackAll(jobInstance: any, url:string, params:any):void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job:{
                instance: jobInstance,
            },
            annotations: {
                states: annotations,
            },
            trackAll:{
                visible: visible,
                framesToTrack: framesToTrack,
                results: results,
                frameStart: frameStart,
                sourceStates: sourceStates,
                preview: preview,
                trackingStatus:trackingStatus,
            },
            player: {
                frame: {
                    number: frame,
                },
            },
        },
    } = state;

    return {
        visible,
        framesToTrack,
        results,
        frameStart,
        sourceStates,
        preview,
        trackingStatus,
        jobInstance,
        annotations,
        frame
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void {
            dispatch(propagateObjectAsync(sessionInstance, objectState, from, to));
        },
        onChangeNumFramesToTrack(frames: number): void {
            dispatch(changeNumFramesToTrackAll(frames));
        },
        cancel(): void {
            dispatch(switchTrackAllModal(false));
        },
        onPrevious():void{
            dispatch(previousTrack());
        },
        onEditLastTrackState(drag:any,resize:any): void{
            dispatch(editLastTrackState(drag,resize));
        },
        trackAll(jobInstance: any, url:string, params:any|undefined=null):void{
            dispatch(fetch(jobInstance,url,params));
        }

    };
}

type Props = StateToProps & DispatchToProps;
class TrackAllConfirmContainer extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }
    public track = ():void=>{
        var loading = document.getElementById('trackall-loading');
        if(loading){
            loading.style.visibility="";
        }
        const {
            trackAll,
            jobInstance,
            sourceStates,
            annotations,
            framesToTrack,
            frame,

        } = this.props;
        var bboxes:number[][] = [];
        var ids: number[] = [];
        annotations.forEach(state => {
            bboxes.push(state.points);
            ids.push(state.clientID);
        });
        console.log(bboxes);
        const params ={
            bboxes:bboxes,
            framesToTrack: framesToTrack,
            frameStart: frame,
            ids:ids,
        }
        trackAll(jobInstance,`tasks/${jobInstance.task.id}/trackall`,params);
        console.log('start tracking all bbs');

    }
    public componentDidUpdate(prevProps: Props): void {
        const {
        } = this.props;

    }

    public render(): JSX.Element {
        const {
            visible,
            framesToTrack,
            results,
            frameStart,
            sourceStates,
            preview,
            trackingStatus,
            cancel,

            onChangeNumFramesToTrack,
        } = this.props;


        return (
            <TrackAllConfirmComponent
                visible={visible}
                framesToTrack = {framesToTrack}
                frameStart = {frameStart}
                preview = {preview}
                results = {results}
                sourceStates = {sourceStates}
                trackingStatus = {trackingStatus}
                onCancel = {cancel}
                onOk = {this.track}
                onChangeNumFramesToTrack={onChangeNumFramesToTrack}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrackAllConfirmContainer);
// ISL END