// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
// ISL TRACKING
// this file controls the UI of the modal that appears when the tracking shortcut 'y' is pressed
import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';
import Button from 'antd/lib/button';
import config from 'cvat-core/src/config';
import Spin from 'antd/lib/spin';

interface Props {
    visible: boolean,
    framesToTrack: number,
    results: any[],
    frameStart: number,
    sourceStates: any[],
    preview: any,
    trackingStatus:boolean,
    onCancel():void,
    onOk():void,
    onChangeNumFramesToTrack(frames: number): void;
}

export default function TrackAllConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        framesToTrack,
        results,
        frameStart,
        sourceStates,
        preview,
        trackingStatus,
        onCancel,
        onOk,
        onChangeNumFramesToTrack
    } = props;

    var num_frames_to_track = 10;
    const { backendAPI } = config;
    return (
        <Modal
            okType='primary'
            okText='Track'
            cancelText='Cancel'
            onOk={onOk}
            onCancel={onCancel}
            title='Track all objects'
            visible={visible}
            width = {200}
        >
            {/* <div className='cvat-track-confirm'>
                <Text>Track up to how many frames? 0 for indefinite.</Text>
                <InputNumber
                    size='small'
                    min={0}
                    value={num_frames_to_track}
                    onChange={(value: number | undefined) => {
                        if(value){
                            num_frames_to_track = value;
                        }
                    }}

                />
            </div> */}
            <div id='track-content-container'>
                <div id='track-text-box'>
                <InputNumber
                    size='small'
                    min={0}
                    defaultValue={30}
                    onChange={(value: number | undefined) => {
                        if(value){
                            num_frames_to_track = value;
                            onChangeNumFramesToTrack(value);
                        }
                    }}

                />
                </div>
                <div id='track-canvas-container'>
                    <div id='track-loading-div'>
                    <Spin id={'trackall-loading'} style={{visibility: "hidden"}}></Spin>
                    </div>
                    <div id='track-canvas-div'>
                    {
                        // automaticTracking.jobInstance != null &&
                        //     <img src={`${backendAPI}/tasks/${automaticTracking.jobInstance.task.id}/data?type=frame&amp;quality=compressed&amp;number=${automaticTracking.current}`} width="1365" height="767" id='track-image' style={{display: "none"}}
                        //         onLoad={()=>{
                        //         console.log('refreshed');
                        //         console.log(automaticTracking.current);
                        //         var loading = document.getElementById('track-loading');
                        //     if (loading){
                        //         loading.style.display ="none";
                        //     }
                        // }}></img>
                    }
                    {/* <canvas id='track-canvas' style={{visibility: "hidden"}}></canvas> */}
                    {/* <canvas id='track-canvas' ></canvas> */}
                    </div>




                </div>

            </div>
        </Modal>
    );
}
// ISL END