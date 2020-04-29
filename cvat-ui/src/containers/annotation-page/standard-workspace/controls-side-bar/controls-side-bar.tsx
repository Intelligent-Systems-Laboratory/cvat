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
    switchTracking, // EDITED FOR USER STORY 12/13
} from 'actions/annotation-actions';
import ControlsSideBarComponent from 'components/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import { ActiveControl, CombinedState, Rotation } from 'reducers/interfaces';

interface StateToProps {
    canvasInstance: Canvas;
    rotateAll: boolean;
    activeControl: ActiveControl;
    keyMap: Record<string, ExtendedKeyMapOptions>;
    normalizedKeyMap: Record<string, string>;
    // EDITED FOR USER STORY 12/13
    tracking: boolean;
    trackedStateID: number | null;
    activatedStateID: number | null;
    // EDITED END
}

interface DispatchToProps {
    mergeObjects(enabled: boolean): void;
    groupObjects(enabled: boolean): void;
    splitTrack(enabled: boolean): void;
    rotateFrame(angle: Rotation): void;
    resetGroup(): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    onSwitchTracking(tracking: boolean, trackedStateID: number | null): void; // EDITED FOR USER STORY 12/13
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            canvas: {
                instance: canvasInstance,
                activeControl,
            },
            // EDITED FOR USER STORY 12/13
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
            // EDITED END
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
        // EDITED FOR USER STORY 12/13
        tracking,
        trackedStateID,
        activatedStateID,
        // EDITED END
    };
}

function dispatchToProps(dispatch: any): DispatchToProps {
    return {
        // EDITED FOR USER STORY 12/13
        onSwitchTracking(tracking: boolean, trackedStateID: number | null): void {
            dispatch(switchTracking(tracking, trackedStateID));
        },
        // EDITED END
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
