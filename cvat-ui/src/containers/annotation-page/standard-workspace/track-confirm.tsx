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
            dispatch(track(automaticTracking.jobInstance,automaticTracking.sourceState,automaticTracking.frameStart,(automaticTracking.frameStart+frames)));
        },
        cancel(): void {
            dispatch(switchTrackModalVisibility(false,null,-1,null));
        },
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
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrackConfirmContainer);
