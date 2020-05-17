// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import { ExtendedKeyMapOptions } from 'react-hotkeys';
import { connect } from 'react-redux';

import { Canvas } from 'cvat-canvas-wrapper';
import {
    mergeObjects,
    groupObjects,
    splitTrack,
    rotateCurrentFrame,
    repeatDrawShapeAsync,
    pasteShapeAsync,
    resetAnnotationsGroup,
    switchTracking, // ISL MANUAL TRACKING
} from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import { ActiveControl, CombinedState, Rotation } from 'reducers/interfaces';

interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
    // ISL MANUAL TRACKING
    tracking: boolean;
    trackedStateID: number | null;
    activatedStateID: number | null;
    // ISL END
}

interface DispatchToProps {
    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
    rotateFrame(angle: Rotation): void;
    resetGroup(): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    onSwitchTracking(tracking: boolean, trackedStateID: number | null): void; // ISL MANUAL TRACKING
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
                activeControl,
            },
            // ISL MANUAL TRACKING
            trackobject: {
                tracking,
                trackedStateID,
            },
            annotations: {
                activatedStateID,
                saving: {
                    uploading: saving,
                    statuses: savingStatuses,
                },
                history,
            },
            // ISL END
        },
        settings: {
            player: {
                rotateAll,
            },
        },
        shortcuts: {
            keyMap,
            normalizedKeyMap,
        },
    } = state;

    return {
        rotateAll,
        canvasInstance,
        activeControl,
        normalizedKeyMap,
        keyMap,
        // ISL MANUAL TRACKING
        tracking,
        trackedStateID,
        activatedStateID,
        // ISL END
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        // ISL MANUAL TRACKING
        onSwitchTracking(tracking: boolean, trackedStateID: number | null): void {
            dispatch(switchTracking(tracking, trackedStateID));
        },
        // ISL END
        mergeObjects(enabled: boolean): void {
            dispatch(mergeObjects(enabled));
        },
        groupObjects(enabled: boolean): void {
            dispatch(groupObjects(enabled));
        },
        splitTrack(enabled: boolean): void {
            dispatch(splitTrack(enabled));
        },
        rotateFrame(rotation: Rotation): void {
            dispatch(rotateCurrentFrame(rotation));
        },
        repeatDrawShape(): void {
            dispatch(repeatDrawShapeAsync());
        },
        pasteShape(): void {
            dispatch(pasteShapeAsync());
        },
        resetGroup(): void {
            dispatch(resetAnnotationsGroup());
        },
    };
}

export default connect(
    mapStateToProps,
    dispatchToProps,
)(ControlsSideBarComponent);
