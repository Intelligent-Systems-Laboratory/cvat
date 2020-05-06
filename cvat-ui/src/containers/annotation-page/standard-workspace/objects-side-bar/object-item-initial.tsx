// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import { LogType } from 'cvat-logger';
import { Canvas } from 'cvat-canvas-wrapper';
import { ActiveControl, CombinedState, ColorBy } from 'reducers/interfaces';
import {
    collapseObjectItems,
    changeLabelColorAsync,
    createAnnotationsAsync,
    updateAnnotationsAsync,
    changeFrameAsync,
    removeObjectAsync,
    changeGroupColorAsync,
    copyShape as copyShapeAction,
    activateObject as activateObjectAction,
    propagateObject as propagateObjectAction,
    pasteShapeAsync,
} from 'actions/annotation-actions';

import ObjectItemInitialComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-initial';

interface OwnProps {
    clientID: number;
}

interface StateToProps {
    objectState: any;
    collapsed: boolean;
    labels: any[];
    attributes: any[];
    jobInstance: any;
    frameNumber: number;
    activated: boolean;
    colorBy: ColorBy;
    ready: boolean;
    colors: string[];
    activeControl: ActiveControl;
    minZLayer: number;
    maxZLayer: number;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas;
}

interface DispatchToProps {
    changeFrame(frame: number): void;
    updateState(objectState: any): void;
    createAnnotations(sessionInstance: any, frameNumber: number, state: any): void;
    collapseOrExpand(objectStates: any[], collapsed: boolean): void;
    activateObject: (activatedStateID: number | null) => void;
    removeObject: (sessionInstance: any, objectState: any) => void;
    copyShape: (objectState: any) => void;
    propagateObject: (objectState: any) => void;
    changeLabelColor(sessionInstance: any, frameNumber: number, label: any, color: string): void;
    changeGroupColor(group: number, color: string): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                states,
                collapsed: statesCollapsed,
                activatedStateID,
                zLayer: {
                    min: minZLayer,
                    max: maxZLayer,
                },
            },
            job: {
                attributes: jobAttributes,
                instance: jobInstance,
                labels,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            canvas: {
                ready,
                activeControl,
                instance: canvasInstance,
            },
            colors,
        },
        settings: {
            shapes: {
                colorBy,
            },
        },
        shortcuts: {
            normalizedKeyMap,
        },
    } = state;

    const index = states
        .map((_state: any): number => _state.clientID)
        .indexOf(own.clientID);

    const collapsedState = typeof (statesCollapsed[own.clientID]) === 'undefined'
        ? true : statesCollapsed[own.clientID];

    return {
        objectState: states[index],
        collapsed: collapsedState,
        attributes: jobAttributes[states[index].label.id],
        labels,
        ready,
        activeControl,
        colorBy,
        colors,
        jobInstance,
        frameNumber,
        activated: activatedStateID === own.clientID,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        canvasInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        updateState(state: any): void {
            dispatch(updateAnnotationsAsync([state]));
        },
        createAnnotations(sessionInstance: any, frameNumber: number, state: any): void {
            dispatch(createAnnotationsAsync(sessionInstance, frameNumber, state));
        },
        collapseOrExpand(objectStates: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(objectStates, collapsed));
        },
        activateObject(activatedStateID: number | null): void {
            dispatch(activateObjectAction(activatedStateID, null));
        },
        removeObject(sessionInstance: any, objectState: any): void {
            dispatch(removeObjectAsync(sessionInstance, objectState, true));
        },
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
            dispatch(pasteShapeAsync());
        },
        propagateObject(objectState: any): void {
            dispatch(propagateObjectAction(objectState));
        },
        changeLabelColor(
            sessionInstance: any,
            frameNumber: number,
            label: any,
            color: string,
        ): void {
            dispatch(changeLabelColorAsync(sessionInstance, frameNumber, label, color));
        },
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
    };
}

type Props = StateToProps & DispatchToProps;
class ObjectItemInitialContainer extends React.PureComponent<Props> {
    private collapse = (): void => {
        const {
            collapseOrExpand,
            objectState,
            collapsed,
        } = this.props;

        collapseOrExpand([objectState], !collapsed);
    };

    private changeLabel = (labelID: string): void => {
        const {
            objectState,
            labels,
        } = this.props;

        const [label] = labels.filter((_label: any): boolean => _label.id === +labelID);
        objectState.label = label;
        this.commit();
    };

    private changeAttribute = (id: number, value: string): void => {
        const { objectState, jobInstance } = this.props;
        jobInstance.logger.log(LogType.changeAttribute, {
            id,
            value,
            object_id: objectState.clientID,
        });
        const attr: Record<number, string> = {};
        attr[id] = value;
        objectState.attributes = attr;
        this.commit();
    };

    private commit(): void {
        const {
            objectState,
            updateState,
        } = this.props;

        updateState(objectState);
    }

    public render(): JSX.Element {
        const {
            objectState,
            labels,
            attributes,
            activated,
        } = this.props;

        const {
            first,
            prev,
            next,
            last,
        } = objectState.keyframes || {
            first: null, // shapes don't have keyframes, so we use null
            prev: null,
            next: null,
            last: null,
        };

        return (
            <ObjectItemInitialComponent
                activated={activated}
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                clientID={objectState.clientID}
                serverID={objectState.serverID}
                attrValues={{ ...objectState.attributes }}
                labelID={objectState.label.id}
                attributes={attributes}
                labels={labels}
                changeLabel={this.changeLabel}
                changeAttribute={this.changeAttribute}
                collapse={this.collapse}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemInitialContainer);
