// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';

import {
    updateAnnotationsAsync,
} from 'actions/annotation-actions';

import { LogType } from 'cvat-logger';

import CanvasLabelMenuComponent from 'components/annotation-page/standard-workspace/canvas-label-menu';

interface StateToProps {
    activatedStateID: number | null;
    visible: boolean;
    top: number;
    left: number;
    
    objectID: number | null;
    // collapsed: boolean | undefined;


    objectState: any;
    labels: any[];
    attributes: any[];
    // attributes: Record<number, any[]>;
    jobInstance: any;
}

interface DispatchToProps {
    updateState(objectState: any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        // annotation: {
        //     annotations: {
        //         activatedStateID,
        //         // collapsed,
        //     },
        //     canvas: {
        //         labelMenu: {
        //             visible,
        //             top,
        //             left,
        //         },
        //     },
        // },

        annotation: {
            annotations: {
                states,
                activatedStateID,
            },
            job: {
                attributes: jobAttributes,
                instance: jobInstance,
                labels,
            },
            canvas: {
                labelMenu: {
                    visible,
                    top,
                    left,
                    objectID,
                },
            },
        },
    } = state;

    const index = states
        .map((_state: any): number => _state.clientID)
        .indexOf(objectID !== null ? objectID : 0);


    return {
        activatedStateID,
        // collapsed: activatedStateID !== null ? collapsed[activatedStateID] : undefined,
        visible,
        left,
        top,
        objectID,

        objectState: objectID !== null ? states[index] : null,
        labels,
        attributes: objectID !== null ? jobAttributes[states[index].label.id] : [],
        // attributes: jobAttributes,
        jobInstance,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateState(state: any): void {
            dispatch(updateAnnotationsAsync([state]));
        },
    }
}

type Props = StateToProps & DispatchToProps;

interface State {
    latestLeft: number;
    latestTop: number;
    left: number;
    top: number;
}

class CanvasLabelMenuContainer extends React.PureComponent<Props, State> {
    private initialized: HTMLDivElement | null;
    private dragging: boolean;
    private dragInitPosX: number;
    private dragInitPosY: number;
    public constructor(props: Props) {
        super(props);

        this.initialized = null;
        this.dragging = false;
        this.dragInitPosX = 0;
        this.dragInitPosY = 0;
        this.state = {
            latestLeft: 0,
            latestTop: 0,
            left: 0,
            top: 0,
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.left === state.latestLeft
            && props.top === state.latestTop) {
            return null;
        }

        return {
            ...state,
            latestLeft: props.left,
            latestTop: props.top,
            top: props.top,
            left: props.left,
        };
    }

    public componentDidMount(): void {
        this.updatePositionIfOutOfScreen();
        window.addEventListener('mousemove', this.moveLabelMenu);
    }

    public componentDidUpdate(prevProps: Props): void {
        // const { collapsed } = this.props;

        const [element] = window.document.getElementsByClassName('cvat-canvas-label-menu');
        // if (collapsed !== prevProps.collapsed && element) {
        //     element.addEventListener('transitionend', () => {
        //         this.updatePositionIfOutOfScreen();
        //     }, { once: true });
        // } else if (element) {
        //     this.updatePositionIfOutOfScreen();
        // }

        if (element) {
            this.updatePositionIfOutOfScreen();
        }

        if (element && (!this.initialized || this.initialized !== element)) {
            this.initialized = element as HTMLDivElement;

            this.initialized.addEventListener('mousedown', (e: MouseEvent): any => {
                this.dragging = true;
                this.dragInitPosX = e.clientX;
                this.dragInitPosY = e.clientY;
            });

            this.initialized.addEventListener('mouseup', () => {
                this.dragging = false;
            });
        }
    }

    public componentWillUnmount(): void {
        window.removeEventListener('mousemove', this.moveLabelMenu);
    }

    private moveLabelMenu = (e: MouseEvent): void => {
        if (this.dragging) {
            this.setState((state) => {
                const value = {
                    left: state.left + e.clientX - this.dragInitPosX,
                    top: state.top + e.clientY - this.dragInitPosY,
                };

                this.dragInitPosX = e.clientX;
                this.dragInitPosY = e.clientY;

                return value;
            });

            e.preventDefault();
        }
    };

    private updatePositionIfOutOfScreen(): void {
        const {
            top,
            left,
        } = this.state;

        const {
            innerWidth,
            innerHeight,
        } = window;

        const [element] = window.document.getElementsByClassName('cvat-canvas-label-menu');
        if (element) {
            const height = element.clientHeight;
            const width = element.clientWidth;

            if (top + height > innerHeight || left + width > innerWidth) {
                this.setState({
                    top: top - Math.max(top + height - innerHeight, 0),
                    left: left - Math.max(left + width - innerWidth, 0),
                });
            }
        }
    }

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
            left,
            top,
        } = this.state;

        // const {
        //     visible,
        //     activatedStateID,
        // } = this.props;

        const {
            activatedStateID,
            visible,
            
            objectID,
        
        
            objectState,
            labels,
            attributes,
        } = this.props;

        return (
            <>
                <CanvasLabelMenuComponent
                    left={left}
                    top={top}
                    visible={visible}
                    activatedStateID={activatedStateID}
                    objectState={objectState}
                    labels={labels}
                    attributes={attributes}
                    objectID={objectID}
                    changeAttribute={this.changeAttribute}
                    changeLabel={this.changeLabel}
                />
                )
            </>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(CanvasLabelMenuContainer);
