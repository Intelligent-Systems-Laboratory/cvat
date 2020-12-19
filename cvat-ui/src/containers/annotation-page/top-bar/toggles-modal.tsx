// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import {
    setGlobalAttributesVisibility,
    okGlobalAttributes,
    switchToggleFeatureModal,
    fetch,
    getJobAsync,
} from 'actions/annotation-actions';
import TogglesModal from 'components/annotation-page/top-bar/toggles-modal';

interface StateToProps {
    visible: boolean;
    jobInstance: any;
    autofitInitState: boolean;
    globalattributesInitState: boolean;
    trackerInitState: string;
    modelInitState: number;
}

interface DispatchToProps {
    onCancel(): void;
    toggleAutoFit(jobInstance: any, value: boolean): void;
    toggleGlobalAttributes(jobInstance: any, value: boolean): void;
    fetchInitialState(jobInstance: any): void;
    changeModel(jobInstance: any, modelNumber: number): void;
    changeTracker(jobInstance: any, tracker: string): void;
    reload(): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            featuresToggle: {
                visible: visible,
                autofitState: autofitInitState,
                globalattributesState: globalattributesInitState,
                trackerState: trackerInitState,
                modelState: modelInitState,
            },
            job: {
                instance: jobInstance
            },
        },

    } = state;

    return {
        visible,
        jobInstance,
        autofitInitState,
        globalattributesInitState,
        modelInitState,
        trackerInitState,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCancel(): void {
            dispatch(switchToggleFeatureModal(false));
        },
        toggleAutoFit(jobInstance: any, value: boolean): void {
            var params = {
                autofit: value,

            }
            dispatch(fetch(jobInstance, "tasks/1/ISLconfig", params));
        },
        toggleGlobalAttributes(jobInstance: any, value: boolean): void {
            var params = {
                globalattributes: value

            }
            dispatch(fetch(jobInstance, "tasks/1/ISLconfig", params));
        },
        fetchInitialState(jobInstance: any): void {
            // console.log('FETCH initial');
            dispatch(fetch(jobInstance, "tasks/1/ISLconfig"));
        },
        changeModel(jobInstance: any, modelNumber: number): void {
            var params = {
                predict_bb_models: modelNumber

            }
            dispatch(fetch(jobInstance, "tasks/1/ISLconfig", params));
        },
        changeTracker(jobInstance: any, tracker: string): void {
            var params = {
                tracker: tracker
            }
            dispatch(fetch(jobInstance, "tasks/1/ISLconfig", params));
        },
        reload(): void {
            getJobAsync(6, 5, 0, []);
        }
    };
}

type Props = StateToProps & DispatchToProps;

class TogglesModalContainer extends React.PureComponent<Props> {

    constructor(props: Props) {
        super(props);
    }
    public componentDidMount(): void {
        const {
            fetchInitialState,
            jobInstance,
        } = this.props;
        // console.log('fetch initial config');
        fetchInitialState(jobInstance);
    }
    private predictBBModelOnChange = (event: any): void => {
        const {
            changeModel,
            jobInstance
        } = this.props;
        // console.log('model changed to ',event.target.value);
        changeModel(jobInstance, parseInt(event.target.value));
    }
    private trackerOnChange = (event: any): void => {
        const {
            jobInstance,
            changeTracker
        } = this.props;
        // console.log('tracker changed to ',event.target.value);
        changeTracker(jobInstance, event.target.value);
    }
    public render(): JSX.Element {
        const {
            visible,
            onCancel,
            jobInstance,
            toggleAutoFit,
            toggleGlobalAttributes,
            autofitInitState,
            globalattributesInitState,
            trackerInitState,
            modelInitState,
            reload
        } = this.props;

        return (
            <TogglesModal
                visible={visible}
                onCancel={onCancel}
                jobInstance={jobInstance}
                toggleAutoFit={toggleAutoFit}
                toggleGlobalAttributes={toggleGlobalAttributes}
                autofitInitState={autofitInitState}
                globalattributesInitState={globalattributesInitState}
                modelOnChange={this.predictBBModelOnChange}
                trackerOnChange={this.trackerOnChange}
                modelInitState={modelInitState}
                trackerInitState={trackerInitState}
                reload={reload}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TogglesModalContainer);
