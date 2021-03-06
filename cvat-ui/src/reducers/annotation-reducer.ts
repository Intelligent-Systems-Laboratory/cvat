// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { AnyAction } from 'redux';

import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { AnnotationActionTypes } from 'actions/annotation-actions';
import { AuthActionTypes } from 'actions/auth-actions';
import { BoundariesActionTypes } from 'actions/boundaries-actions';
import { AnnotationState, ActiveControl, ShapeType, ObjectType, ContextMenuType, Workspace } from './interfaces';
import Empty from 'antd/lib/empty';

const defaultState: AnnotationState = {
    activities: {
        loads: {},
    },
    canvas: {
        contextMenu: {
            visible: false,
            left: 0,
            top: 0,
            type: ContextMenuType.CANVAS_SHAPE,
            pointID: null,
        },
        instance: new Canvas(),
        ready: false,
        activeControl: ActiveControl.CURSOR,
    },
    job: {
        labels: [],
        requestedId: null,
        instance: null,
        attributes: {},
        fetching: false,
        saving: false,
    },
    player: {
        frame: {
            number: 0,
            filename: '',
            data: null,
            fetching: false,
            delay: 0,
            changeTime: null,
        },
        playing: false,
        frameAngles: [],
    },
    drawing: {
        activeShapeType: ShapeType.RECTANGLE,
        activeLabelID: 0,
        activeObjectType: ObjectType.SHAPE,
    },
    annotations: {
        selectedStatesID: [],
        activatedStateID: null,
        activatedAttributeID: null,
        saving: {
            uploading: false,
            statuses: [],
        },
        collapsed: {},
        collapsedAll: true,
        states: [],
        filters: [],
        filtersHistory: JSON.parse(window.localStorage.getItem('filtersHistory') || '[]'),
        resetGroupFlag: false,
        history: {
            undo: [],
            redo: [],
        },
        zLayer: {
            min: 0,
            max: 0,
            cur: 0,
        },
    },
    // ISL AUTOFIT
    autoFitObjects: [],
    // ISL END
    // ISL INTERPOLATION
    asLastKeyframeObjects: [],
    // ISL END
    // ISL MANUAL TRACKING
    trackobject: {
        tracking: false,
        trackedStateID: null,
    },
    // ISL END
    propagate: {
        objectState: null,
        frames: 50,
    },
    statistics: {
        visible: false,
        collecting: false,
        data: null,
    },
    aiToolsRef: React.createRef(),
    colors: [],
    sidebarCollapsed: false,
    appearanceCollapsed: false,
    tabContentHeight: 0,
    workspace: Workspace.STANDARD,
    globalAttributes: {
        weather:"",
        lighting:"",
    },
    globalAttributesVisibility: false,
    isFetchingAttributes: false,
    isSavingAttributes: false,
    globalAttributesDB: {},
    // ISL TRACKING
    automaticTracking:{
        tracking: false,
        frameStart: 0,
        states: [],
        clientID:0,
        modalVisible:false,
        numberOfFramesToTrack:1,
        jobInstance:null,
        sourceState:null,
        image: null,
        current: 30,

    },
    // ISL END
    // ISL FEATURE TOGGLE
    featuresToggle:{
        visible: false,
        autofitState:false,
        globalattributesState: false,
        modelState:0,
        trackerState:'pysot',
    },
    // ISL END
    // mabe predict bbs
    predictions :[[0,0,0,0]],
    // mabe end

    // mabe track all bbs
    trackAll:{
        visible: false,
        framesToTrack: 30,
        results: [],
        frameStart: 0,
        sourceStates: [],
        trackingStatus:false,
        loading:false,
        mode:'NORMAL',
        // for preview and editing mode
        selectedObjectID: 1,
        bbox_slice: [0,0,0,0],
        slice:14, // the last index in the default framerange which is 30 (skip by 2)
        annotations:{},
        labelID:1
    }
    // mabe end

};

export default (state = defaultState, action: AnyAction): AnnotationState => {
    switch (action.type) {
        // mabe track all bbs
        case AnnotationActionTypes.GET_LABEL_ID_SERVER: {
            const {
                labelID
            } = action.payload;
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    labelID:labelID
                }
            };
        }
        case AnnotationActionTypes.GET_ANNOTATIONS_SERVER: {
            const {
                data
            } = action.payload;
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    annotations:data
                }
            };
        }
        case AnnotationActionTypes.CHANGE_SLICE_TRACKALL: {
            const {
                slice
            } = action.payload;
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    slice:slice
                }
            };
        }
        case AnnotationActionTypes.CHANGE_PREVIEW_OBJECTID: {
            const {
                objectID
            } = action.payload;
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    selectedObjectID:objectID,
                }
            };
        }
        case AnnotationActionTypes.CHANGE_NUM_FRAME_TO_TRACK_ALL: {
            const {
                frames
            } = action.payload;
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    framesToTrack:frames,
                    loading:true,
                }
            };
        }
        case AnnotationActionTypes.SWITCH_AUTO_TRACKALL: {
            const {
                status
            } = action.payload;
            if(!status){
                return {
                    ...state,
                    trackAll: {
                        ...state.trackAll,
                        trackingStatus:status,
                        results:[]
                    }
                };
            }else{
                return {
                    ...state,
                    trackAll: {
                        ...state.trackAll,
                        trackingStatus:status,
                    }
                };
            }

        }
        case AnnotationActionTypes.UPDATE_TRACKALL_RESULTS: {
            const {
                tracks,
                trackingStatus,
                frameStart,
                ids,
                mode
            } = action.payload;
            if(mode=='NORMAL'){
                return {
                    ...state,
                    trackAll: {
                        ...state.trackAll,
                        results:tracks,
                        trackingStatus:trackingStatus,
                        frameStart:(frameStart?frameStart:state.trackAll.frameStart),
                        sourceStates:(ids?ids:state.trackAll.sourceStates),
                        loading:false,
                        mode:mode,
                    }
                };
            }else if(mode=='APPEND'){
                var temp: any[] = [];
                for(var i=0;i<state.trackAll.results.length;i++){
                    var track = [];
                    for(var j=0;j<state.trackAll.results[i].length;j++){
                        track.push(state.trackAll.results[i][j]);
                    }
                    temp.push(track);
                }
                for(var i=0;i<temp.length;i++){
                    tracks[i].forEach((bbox: number[])=> {
                        temp[i].push(bbox);
                    });
                }
                console.log('temp',temp);

                var slice:number = (state.trackAll.slice+tracks[0].length);
                return {
                    ...state,
                    trackAll: {
                        ...state.trackAll,
                        results:temp,
                        trackingStatus:trackingStatus,
                        frameStart:(frameStart?frameStart:state.trackAll.frameStart),
                        sourceStates:(ids?ids:state.trackAll.sourceStates),
                        loading:false,
                        mode:mode,
                        slice:slice
                    }
                };
            }else if(mode=='EDIT'){
                const{
                    index,
                    drag,
                    slice,
                    bbox
                }=action.payload;
                var temp = [...state.trackAll.results];

                temp[index][slice]=bbox;

                return {
                    ...state,
                    trackAll: {
                        ...state.trackAll,
                        results:temp,
                        trackingStatus:trackingStatus,
                        frameStart:(frameStart?frameStart:state.trackAll.frameStart),
                        sourceStates:(ids?ids:state.trackAll.sourceStates),
                        loading:false,
                        mode:mode,
                        bbox_slice:bbox,
                    }
                };
            }

        }
        case AnnotationActionTypes.SWITCH_AUTO_TRACKALL_MODAL: {
            const { visible } = action.payload;
            let states:number[]=[];
            state.annotations.states.forEach(state => {
                states.push(state.clientID);
            })
            return {
                ...state,
                trackAll: {
                    ...state.trackAll,
                    visible:visible,
                    loading:true,
                    sourceStates:states
                }
            };
        }
        //
        // mabe predict bbs
        case AnnotationActionTypes.PREDICT_BBS: {
            const { bboxes } = action.payload;
            return {
                ...state,
                predictions:bboxes
            };
        }
        // mabe end
        // ISL FEATURES MODAL

        case AnnotationActionTypes.TOGGLE_AUTOFIT: {
            const { autofit,globalattributes,tracker,model } = action.payload;
            return {
                ...state,
                featuresToggle:{
                    ...state.featuresToggle,
                    autofitState:autofit,
                    globalattributesState:globalattributes,
                    modelState:model,
                    trackerState:tracker,
                }
            };
        }
        case AnnotationActionTypes.SWITCH_TOGGLE_FEATURES_MODAL: {
            const { visible } = action.payload;
            return {
                ...state,
                featuresToggle:{
                    ...state.featuresToggle,
                    visible:visible,
                }
            };
        }
        // ISL END
        // ISL TRACKING
        case AnnotationActionTypes.GET_FRAME: {
            const { image } = action.payload;
            return {
                ...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    image: image,
                }
            };
        }
        case AnnotationActionTypes.CHANGE_NUM_FRAMES_TO_TRACK: {
            const { num_frames } = action.payload;
            return {
                ...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    numberOfFramesToTrack:num_frames,
                    modalVisible:false,
                }
            };
        }
        case AnnotationActionTypes.SWITCH_AUTO_TRACK_MODAL: {
            const { visibility,
                    jobInstance,
                    frame_num,
                    sourceState } = action.payload;
            return {
                ...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    modalVisible:visibility,
                    jobInstance:jobInstance,
                    frameStart: frame_num,
                    sourceState:sourceState,
                    current: frame_num+30,
                }
            };
        }
        case AnnotationActionTypes.SWITCH_AUTO_TRACK: {
            const { status } = action.payload;

            return {
                ...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    tracking:status,
                }
            };

        }
        case AnnotationActionTypes.SWITCH_CURRENT_DISPLAY: {
            const { current } = action.payload;

            return {
                ...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    current:current,
                }
            };

        }
        case AnnotationActionTypes.PREVIOUS_TRACK: {
            var index = state.automaticTracking.states.length-15;
            if(index>0){
                console.log('start index to remove',index);
                console.log('before:');
                var result_states:any[] = [];
                var counter = 0;
                var length = state.automaticTracking.states.length;
                for (var temp of state.automaticTracking.states){
                    if(counter<length-15){
                        result_states.push(temp);
                        counter++;
                    }
                }

                return {
                    ...state,
                    automaticTracking:{
                        ...state.automaticTracking,
                        current: state.automaticTracking.current-30,
                        states: result_states,
                    }
                };
            }else{
                return {
                    ...state
                }
            }

        }
        case AnnotationActionTypes.START_TRACK: {
            const { statesToUpdate,tracking,from,clientID,mode} = action.payload;
            const result_states: any[] = [];
            let frame_start = state.automaticTracking.frameStart;
            if(mode == 'OVERRIDE'){
                for(let state of statesToUpdate){
                    result_states.push(state);
                }
                frame_start = from;
            }
            else if (mode == 'APPEND'){
                let prev_states = state.automaticTracking.states;
                for(let state of prev_states){
                    result_states.push(state);
                }
                for(let state of statesToUpdate){
                    result_states.push(state);
                }

            }
            return {
                ...state,
                automaticTracking: {
                    ...state.automaticTracking,
                    states:result_states,
                    tracking:tracking,
                    frameStart: frame_start,
                    clientID:clientID,
                }
            };

        }
        case AnnotationActionTypes.STOP_TRACK: {
            return {...state,};
        }
        case AnnotationActionTypes.EDIT_LAST_TRACK_STATE: {
            const {
                drag,
                resize,
            } = action.payload;
            let result_states = state.automaticTracking.states;
            let stateToEdit = result_states[result_states.length-1];
            let width = stateToEdit[2]-stateToEdit[0];
            let height = stateToEdit[3]-stateToEdit[1];
            let firstStateIndex = result_states.length-16;
            if(firstStateIndex<0){
                firstStateIndex=0;
            }
            let firstState = result_states[firstStateIndex];
            for(var i=firstStateIndex+1;i<result_states.length-1;i++){
                // TO DO: Write the equations
                // TO DO: Correct the terms
                var temp_state = result_states[i];
                let temp_width = temp_state[2]-temp_state[0];
                let temp_height = temp_state[3]-temp_state[1];
                temp_state[0]=temp_state[0]+(temp_width/width)*drag.x;
                temp_state[1]=temp_state[1]+(temp_height/height)*drag.y;
                temp_state[2]=temp_state[2]+(temp_width/width)*(drag.x+resize.x);
                temp_state[3]=temp_state[3]+(temp_height/height)*(drag.y+resize.y);
            }
            stateToEdit[0] = stateToEdit[0]+drag.x;
            stateToEdit[1] = stateToEdit[1]+drag.y;
            stateToEdit[2] = stateToEdit[2]+drag.x+resize.x;
            stateToEdit[3] = stateToEdit[3]+drag.y+resize.y;
            return {...state,
                automaticTracking:{
                    ...state.automaticTracking,
                    states: result_states,
                }

            };
        }
        // ISL END
        // ISL GLOBAL ATTRIBUTES
        case AnnotationActionTypes.START_EDIT_LABEL: {
            const { task_id,
            data } = action.payload;
            return {...state,};
        }
        case AnnotationActionTypes.STOP_EDIT_LABEL: {
            return {...state,};
        }
        case AnnotationActionTypes.SET_ATTRIBUTE_VISIBILITY: {
            const{visibility} = action.payload;
            return {...state,
                globalAttributesVisibility: visibility,
            };
        }
        case AnnotationActionTypes.START_FETCH_ATTRIBUTES: {
            return {...state,
                isFetchingAttributes: true,
            };
        }
        case AnnotationActionTypes.STOP_FETCH_ATTRIBUTES: {
            const{data} = action.payload;
            let parsedData = "";
            try{
                parsedData = JSON.parse(data);
            }catch{
                console.log('error parsing data from database');
            }
            return {...state,
                isFetchingAttributes: false,
                globalAttributesDB:parsedData,
            };
        }
        case AnnotationActionTypes.START_SAVE_ATTRIBUTES: {
            console.log('MARKER START SAVE');
            return {...state,
                isSavingAttributes: true,
            };
        }
        case AnnotationActionTypes.STOP_SAVE_ATRIBUTES: {
            console.log('MARKER END STOP SAVE');
            return {...state,
                isSavingAttributes: false,
            };
        }
        // ISL END
        // ISL AUTOFIT
        case AnnotationActionTypes.START_AUTO_FIT: {
            const { clientID } = action.payload;
            const newAutoFitObjects = [...state.autoFitObjects];
            newAutoFitObjects.push(clientID);
            return {
                ...state,
                autoFitObjects: newAutoFitObjects,
            };
        }
        case AnnotationActionTypes.STOP_AUTO_FIT: {
            const { clientID } = action.payload;

            const newAutoFitObjects = [...state.autoFitObjects];
            newAutoFitObjects.splice(state.autoFitObjects.indexOf(clientID), 1);
            return {
                ...state,
                autoFitObjects: newAutoFitObjects,
            };
        }
        // ISL END
        // ISL INTERPOLATION
        case AnnotationActionTypes.START_COPY_LAST_KEYFRAME: {
            const { clientID } = action.payload;
            const newAsLastKeyframeObjects = [...state.asLastKeyframeObjects];
            newAsLastKeyframeObjects.push(clientID);
            return {
                ...state,
                asLastKeyframeObjects: newAsLastKeyframeObjects,
            };
        }
        case AnnotationActionTypes.STOP_AUTO_FIT: {
            const { clientID } = action.payload;

            const newAsLastKeyframeObjects= [...state.asLastKeyframeObjects];
            newAsLastKeyframeObjects.splice(state.asLastKeyframeObjects.indexOf(clientID), 1);
            return {
                ...state,
                asLastKeyframeObjects: newAsLastKeyframeObjects,
            };
        }
        // ISL END
        // ISL MANUAL TRACKING
        case AnnotationActionTypes.SWITCH_TRACKING: {
            const { tracking, trackedStateID } = action.payload;

            return {
                ...state,
                trackobject: {
                    ...state.trackobject,
                    tracking,
                    trackedStateID,
                }
            };
        }
        // ISL END
        case AnnotationActionTypes.GET_JOB: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: null,
                    requestedId: action.payload.requestedId,
                    fetching: true,
                },
            };
        }
        case BoundariesActionTypes.RESET_AFTER_ERROR:
        case AnnotationActionTypes.GET_JOB_SUCCESS: {
            const {
                job,
                states,
                frameNumber: number,
                frameFilename: filename,
                colors,
                filters,
                frameData: data,
                minZ,
                maxZ,
            } = action.payload;

            return {
                ...state,
                job: {
                    ...state.job,
                    fetching: false,
                    instance: job,
                    labels: job.task.labels,
                    attributes: job.task.labels.reduce((acc: Record<number, any[]>, label: any): Record<
                        number,
                        any[]
                    > => {
                        acc[label.id] = label.attributes;
                        return acc;
                    }, {}),
                },
                annotations: {
                    ...state.annotations,
                    states,
                    filters,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
                    },
                },
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        filename,
                        number,
                        data,
                    },
                    frameAngles: Array(job.stopFrame - job.startFrame + 1).fill(0),
                },
                drawing: {
                    ...state.drawing,
                    activeLabelID: job.task.labels[0].id,
                    activeObjectType: job.task.mode === 'interpolation' ? ObjectType.TRACK : ObjectType.SHAPE,
                },
                canvas: {
                    ...state.canvas,
                    instance: new Canvas(),
                },
                colors,
            };
        }
        case AnnotationActionTypes.GET_JOB_FAILED: {
            return {
                ...state,
                job: {
                    ...state.job,
                    instance: undefined,
                    fetching: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: true,
                    },
                },
                canvas: {
                    ...state.canvas,
                    ready: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_SUCCESS: {
            const { number, data, filename, states, minZ, maxZ, curZ, delay, changeTime } = action.payload;

            const activatedStateID = states
                .map((_state: any) => _state.clientID)
                .includes(state.annotations.activatedStateID)
                ? state.annotations.activatedStateID
                : null;

            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        data,
                        filename,
                        number,
                        fetching: false,
                        changeTime,
                        delay,
                    },
                },
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    states,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: curZ,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_FRAME_FAILED: {
            return {
                ...state,
                player: {
                    ...state.player,
                    frame: {
                        ...state.player.frame,
                        fetching: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.ROTATE_FRAME: {
            const { offset, angle, rotateAll } = action.payload;
            return {
                ...state,
                player: {
                    ...state.player,
                    frameAngles: state.player.frameAngles.map((_angle: number, idx: number) =>
                        rotateAll || offset === idx ? angle : _angle,
                    ),
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: true,
                        statuses: [],
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS: {
            const { states } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        uploading: false,
                    },
                },
            };
        }
        case AnnotationActionTypes.SAVE_UPDATE_ANNOTATIONS_STATUS: {
            const { status } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    saving: {
                        ...state.annotations.saving,
                        statuses: [...state.annotations.saving.statuses, status],
                    },
                },
            };
        }
        case AnnotationActionTypes.SWITCH_PLAY: {
            const { playing } = action.payload;

            return {
                ...state,
                player: {
                    ...state.player,
                    playing,
                },
            };
        }
        case AnnotationActionTypes.COLLAPSE_SIDEBAR: {
            return {
                ...state,
                sidebarCollapsed: !state.sidebarCollapsed,
            };
        }
        case AnnotationActionTypes.COLLAPSE_APPEARANCE: {
            return {
                ...state,
                appearanceCollapsed: !state.appearanceCollapsed,
            };
        }
        case AnnotationActionTypes.UPDATE_TAB_CONTENT_HEIGHT: {
            const { tabContentHeight } = action.payload;
            return {
                ...state,
                tabContentHeight,
            };
        }
        case AnnotationActionTypes.COLLAPSE_OBJECT_ITEMS: {
            const { states, collapsed } = action.payload;

            const updatedCollapsedStates = { ...state.annotations.collapsed };
            const totalStatesCount = state.annotations.states.length;
            for (const objectState of states) {
                updatedCollapsedStates[objectState.clientID] = collapsed;
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    collapsed: updatedCollapsedStates,
                    collapsedAll: states.length === totalStatesCount ? collapsed : state.annotations.collapsedAll,
                },
            };
        }
        case AnnotationActionTypes.CONFIRM_CANVAS_READY: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    ready: true,
                },
            };
        }
        case AnnotationActionTypes.DRAG_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.DRAG_CANVAS : ActiveControl.CURSOR;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.ZOOM_CANVAS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.ZOOM_CANVAS : ActiveControl.CURSOR;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.REMEMBER_CREATED_OBJECT: {
            const { shapeType, labelID, objectType, points, activeControl, rectDrawingMethod } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
                drawing: {
                    activeInteractor: undefined,
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                    activeRectDrawingMethod: rectDrawingMethod,
                },
            };
        }
        case AnnotationActionTypes.REPEAT_DRAW_SHAPE: {
            const { activeControl } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.MERGE_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.MERGE : ActiveControl.CURSOR;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.GROUP_OBJECTS: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.GROUP : ActiveControl.CURSOR;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.SPLIT_TRACK: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.SPLIT : ActiveControl.CURSOR;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.SHAPE_DRAWN: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS: {
            const { history, states: updatedStates, minZ, maxZ } = action.payload;
            const { states: prevStates } = state.annotations;
            const nextStates = [...prevStates];

            const clientIDs = prevStates.map((prevState: any): number => prevState.clientID);
            for (const updatedState of updatedStates) {
                const index = clientIDs.indexOf(updatedState.clientID);
                if (index !== -1) {
                    nextStates[index] = updatedState;
                }
            }

            const maxZLayer = Math.max(state.annotations.zLayer.max, maxZ);
            const minZLayer = Math.min(state.annotations.zLayer.min, minZ);

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    zLayer: {
                        min: minZLayer,
                        max: maxZLayer,
                        cur: maxZLayer,
                    },
                    states: nextStates,
                    history,
                },
            };
        }
        case AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED: {
            const { states } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                },
            };
        }
        case AnnotationActionTypes.CREATE_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.MERGE_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.RESET_ANNOTATIONS_GROUP: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    resetGroupFlag: true,
                },
            };
        }
        case AnnotationActionTypes.GROUP_ANNOTATIONS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    resetGroupFlag: false,
                },
            };
        }
        case AnnotationActionTypes.GROUP_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.SPLIT_ANNOTATIONS_SUCCESS: {
            const { states, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    states,
                    history,
                },
            };
        }
        case AnnotationActionTypes.ACTIVATE_OBJECT: {
            const { activatedStateID, activatedAttributeID } = action.payload;

            const {
                canvas: { activeControl, instance },
            } = state;

            if (activeControl !== ActiveControl.CURSOR || instance.mode() !== CanvasMode.IDLE) {
                return state;
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    activatedAttributeID,
                },
            };
        }
        case AnnotationActionTypes.SELECT_OBJECTS: {
            const { selectedStatesID } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    selectedStatesID,
                },
            };
        }
        case AnnotationActionTypes.REMOVE_OBJECT_SUCCESS: {
            const { objectState, history } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                    activatedStateID: null,
                    states: state.annotations.states.filter(
                        (_objectState: any) => _objectState.clientID !== objectState.clientID,
                    ),
                },
            };
        }
        case AnnotationActionTypes.PASTE_SHAPE: {
            const { activeControl } = action.payload;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
            };
        }
        case AnnotationActionTypes.COPY_SHAPE: {
            const { objectState } = action.payload;

            return {
                ...state,
                drawing: {
                    ...state.drawing,
                    activeInitialState: objectState,
                },
            };
        }
        case AnnotationActionTypes.EDIT_SHAPE: {
            const { enabled } = action.payload;
            const activeControl = enabled ? ActiveControl.EDIT : ActiveControl.CURSOR;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl,
                },
            };
        }
        case AnnotationActionTypes.PROPAGATE_OBJECT: {
            const { objectState } = action.payload;
            return {
                ...state,
                propagate: {
                    ...state.propagate,
                    objectState,
                },
            };
        }
        case AnnotationActionTypes.PROPAGATE_OBJECT_SUCCESS: {
            const { history } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                },
                propagate: {
                    ...state.propagate,
                    objectState: null,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_PROPAGATE_FRAMES: {
            const { frames } = action.payload;

            return {
                ...state,
                propagate: {
                    ...state.propagate,
                    frames,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_SHOWING_STATISTICS: {
            const { visible } = action.payload;

            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    visible,
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS: {
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: true,
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS_SUCCESS: {
            const { data } = action.payload;
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: false,
                    data,
                },
            };
        }
        case AnnotationActionTypes.COLLECT_STATISTICS_FAILED: {
            return {
                ...state,
                statistics: {
                    ...state.statistics,
                    collecting: false,
                    data: null,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_JOB_STATUS: {
            return {
                ...state,
                job: {
                    ...state.job,
                    saving: true,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_JOB_STATUS_SUCCESS: {
            return {
                ...state,
                job: {
                    ...state.job,
                    saving: false,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_JOB_STATUS_FAILED: {
            return {
                ...state,
                job: {
                    ...state.job,
                    saving: false,
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS: {
            const { job, loader } = action.payload;
            const { loads } = state.activities;
            loads[job.id] = job.id in loads ? loads[job.id] : loader.name;

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_FAILED: {
            const { job } = action.payload;
            const { loads } = state.activities;

            delete loads[job.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
            };
        }
        case AnnotationActionTypes.UPLOAD_JOB_ANNOTATIONS_SUCCESS: {
            const { states, job, history } = action.payload;
            const { loads } = state.activities;

            delete loads[job.id];

            return {
                ...state,
                activities: {
                    ...state.activities,
                    loads: {
                        ...loads,
                    },
                },
                annotations: {
                    ...state.annotations,
                    history,
                    states,
                    selectedStatesID: [],
                    activatedStateID: null,
                    collapsed: {},
                },
            };
        }
        case AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS: {
            const { history } = action.payload;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    history,
                    selectedStatesID: [],
                    activatedStateID: null,
                    collapsed: {},
                    states: [],
                },
            };
        }
        case AnnotationActionTypes.UPDATE_CANVAS_CONTEXT_MENU: {
            const { visible, left, top, type, pointID } = action.payload;

            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    contextMenu: {
                        ...state.canvas.contextMenu,
                        visible,
                        left,
                        top,
                        type,
                        pointID,
                    },
                },
            };
        }
        case AnnotationActionTypes.REDO_ACTION_SUCCESS:
        case AnnotationActionTypes.UNDO_ACTION_SUCCESS: {
            const { history, states, minZ, maxZ } = action.payload;

            const activatedStateID = states
                .map((_state: any) => _state.clientID)
                .includes(state.annotations.activatedStateID)
                ? state.annotations.activatedStateID
                : null;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    states,
                    history,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
                    },
                },
            };
        }
        case AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS: {
            const { states, minZ, maxZ } = action.payload;
            const activatedStateID = states
                .map((_state: any) => _state.clientID)
                .includes(state.annotations.activatedStateID)
                ? state.annotations.activatedStateID
                : null;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    states,
                    zLayer: {
                        min: minZ,
                        max: maxZ,
                        cur: maxZ,
                    },
                },
            };
        }
        case AnnotationActionTypes.CHANGE_ANNOTATIONS_FILTERS: {
            const { filters, filtersHistory } = action.payload;

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    filtersHistory,
                    filters,
                },
            };
        }
        case AnnotationActionTypes.SWITCH_Z_LAYER: {
            const { cur } = action.payload;
            const { max, min } = state.annotations.zLayer;

            let { activatedStateID } = state.annotations;
            if (activatedStateID !== null) {
                const idx = state.annotations.states.map((_state: any) => _state.clientID).indexOf(activatedStateID);
                if (idx !== -1) {
                    if (state.annotations.states[idx].zOrder > cur) {
                        activatedStateID = null;
                    }
                } else {
                    activatedStateID = null;
                }
            }

            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID,
                    zLayer: {
                        ...state.annotations.zLayer,
                        cur: Math.max(Math.min(cur, max), min),
                    },
                },
            };
        }
        case AnnotationActionTypes.ADD_Z_LAYER: {
            const { max } = state.annotations.zLayer;
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    zLayer: {
                        ...state.annotations.zLayer,
                        max: max + 1,
                        cur: max + 1,
                    },
                },
            };
        }
        case AnnotationActionTypes.INTERACT_WITH_CANVAS: {
            return {
                ...state,
                annotations: {
                    ...state.annotations,
                    activatedStateID: null,
                },
                drawing: {
                    ...state.drawing,
                    activeInteractor: action.payload.activeInteractor,
                    activeLabelID: action.payload.activeLabelID,
                },
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.AI_TOOLS,
                },
            };
        }
        case AnnotationActionTypes.CHANGE_WORKSPACE: {
            const { workspace } = action.payload;
            if (state.canvas.activeControl !== ActiveControl.CURSOR) {
                return state;
            }

            return {
                ...state,
                workspace,
            };
        }
        case AnnotationActionTypes.RESET_CANVAS: {
            return {
                ...state,
                canvas: {
                    ...state.canvas,
                    activeControl: ActiveControl.CURSOR,
                },
            };
        }
        case AnnotationActionTypes.CLOSE_JOB:
        case AuthActionTypes.LOGOUT_SUCCESS: {
            return { ...defaultState };
        }
        case AnnotationActionTypes.EDIT_GLOBAL_ATTRIBUTES:{
            const {globalAttributes,visibility} = action.payload;
            if(visibility!=undefined){
                return {
                    ...state,
                globalAttributesVisibility:visibility,
                };
            }
            return {
                ...state,
                globalAttributes:globalAttributes,
            };
        }
        default: {
            return state;
        }
    }
};
