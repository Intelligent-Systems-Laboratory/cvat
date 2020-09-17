// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    propagateObject as propagateObjectAction,
    changePropagateFrames as changePropagateFramesAction,
    propagateObjectAsync,
    switchTrackModalVisibility,
    changeNumFramesToTrack,
    track,
    switchAutoTrack,
} from 'actions/annotation-actions';

import { CombinedState } from 'reducers/interfaces';
import TrackConfirmComponent from 'components/annotation-page/standard-workspace/track-confirm';

interface StateToProps {
    objectState: any | null;
    frameNumber: number;
    stopFrame: number;
    propagateFrames: number;
    jobInstance: any;
    automaticTracking:any;
}

interface DispatchToProps {
    cancel(): void;
    propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void;
    onChangeNumFramesToTrack(frames: number,automaticTracking:any): void;
    onChangeCurrentDisplay(frame_num:number,automaticTracking:any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            propagate: {
                objectState,
                frames: propagateFrames,
            },
            job: {
                instance: {
                    stopFrame,
                },
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            automaticTracking:automaticTracking,
        },
    } = state;

    return {
        objectState,
        frameNumber,
        stopFrame,
        propagateFrames,
        jobInstance,
        automaticTracking
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void {
            dispatch(propagateObjectAsync(sessionInstance, objectState, from, to));
        },
        onChangeNumFramesToTrack(frames: number,automaticTracking:any): void {
            dispatch(changeNumFramesToTrack(frames));
            dispatch(switchAutoTrack(true));
        },
        cancel(): void {
            dispatch(switchTrackModalVisibility(false,null,-1,null));
        },
        onChangeCurrentDisplay(frame_num:number,automaticTracking:any): void{
            dispatch(track(automaticTracking.jobInstance,automaticTracking.sourceState,frame_num,frame_num+30,'APPEND',automaticTracking.states[automaticTracking.states.length-1]));
        }
    };
}

type Props = StateToProps & DispatchToProps;
class TrackConfirmContainer extends React.PureComponent<Props> {
    private changeNumFramesToTrack = (num_frames:number): void => {
        const {
            onChangeNumFramesToTrack,
            automaticTracking
        } = this.props;
        onChangeNumFramesToTrack(num_frames,automaticTracking);

    };
    private changeCurrent = (frame_num:number): void => {
        const {
            onChangeCurrentDisplay,
            automaticTracking
        } = this.props;
        onChangeCurrentDisplay(frame_num,automaticTracking);
    }
    public loadImage = (outputImg:HTMLImageElement):void => {
        const {
            automaticTracking
        } = this.props;
        var index = Math.floor(automaticTracking.current/2)-1;
        var points = automaticTracking.states[index]; // bounding box of the result of tracking in the current frame
        console.log('index',index);
        console.log('points',points);
        var width = points[2] - points[0];
        var height = points[3] - points[1];
        var background:number[] = [points[0]-width,points[1]-height,points[2]+width,points[3]+height]
        for (let coord of background){
            if (coord < 0){
                coord = 0
            }

        }

        let canvas = window.document.getElementById('track-canvas') as HTMLCanvasElement;
        if(canvas){
            canvas.height = 3*height;
            canvas.width = 3*width;
            let ctx = canvas.getContext('2d');
            if(ctx && outputImg){
                ctx.drawImage(outputImg,background[0],background[1],3*width,3*height,0,0,canvas.width,canvas.height);
                ctx.beginPath();
                ctx.lineWidth = 6;
                ctx.strokeStyle = "red";
                ctx.rect(width, height, width, height);
                ctx.stroke();

            }

            console.log(canvas);
        }
    }
    public draw = ():void => {
        const {
            automaticTracking
        } = this.props;

        console.log('load the image in frame ',automaticTracking.current);
        var outputImg = document.getElementById('track-image') as HTMLImageElement;
        outputImg.onload = () =>{
            console.log("Image 1 ready to append");
            this.loadImage(outputImg);
        };
        this.loadImage(outputImg);



    }
    public componentDidUpdate(prevProps: Props): void {
        const {
            automaticTracking
        } = this.props;
        if(automaticTracking!== prevProps.automaticTracking){
            console.log('STATES TO UPDATE track-confirm',automaticTracking);
            // this.track();
            if(automaticTracking.states.length > 0){
                this.draw();
            }
        }
    }

    public render(): JSX.Element {
        const {
            frameNumber,
            stopFrame,
            propagateFrames,
            cancel,
            objectState,
            automaticTracking
        } = this.props;

        const propagateUpToFrame = Math.min(frameNumber + propagateFrames, stopFrame);

        return (
            <TrackConfirmComponent
                visible={automaticTracking.modalVisible}
                stopFrame={stopFrame}
                frameNumber={frameNumber}
                cancel={cancel}
                onOk = {this.changeNumFramesToTrack}
                automaticTracking = {automaticTracking}
                onNext = {this.changeCurrent}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrackConfirmContainer);
