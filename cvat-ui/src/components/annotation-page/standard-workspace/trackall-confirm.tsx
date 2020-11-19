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
import Radio, { RadioChangeEvent } from 'antd/lib/radio';

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
    onChangeNumFramesToTrack(frames: number): void,
    jobInstance: any,
    previewChangeHandler(clientID: number): void,
    loading:boolean,
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
        onChangeNumFramesToTrack,
        jobInstance,
        previewChangeHandler,
        loading,
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
            title='Vehicle Tracking'
            visible={visible}
            width = {1600}
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
                <div id='trackall-body'>
                    <div id='track-canvas-container'>
                        <div id='track-loading-div'>
                            {
                                loading && <Spin id={'trackall-loading'}></Spin>
                            }

                        </div>
                        <div id='trackall-canvas-div'>
                        {
                            // automaticTracking.jobInstance != null &&
                                <img src={`${backendAPI}/tasks/${jobInstance.task.id}/data?type=frame&amp;quality=compressed&amp;number=${30}`} width="1365" height="767" id='trackall-image' style={{display: "none"}}
                                    onLoad={()=>{
                                    console.log('track all image loaded ');
                                    // console.log(automaticTracking.current);
                                    let outputImg = document.getElementById('trackall-image') as HTMLImageElement;

                                    let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
                                    let ctx = canvas.getContext('2d');
                                    if(ctx && outputImg){
                                        ctx.drawImage(outputImg,0,0,canvas.width,canvas.height);
                                    }
                                canvas.style.visibility ='';
                            }}></img>
                        }
                        <canvas id='trackall-canvas' style={{visibility: "hidden"}} width='1200' height={1200*1080/1920}></canvas>
                        {/* <canvas id='track-canvas' ></canvas> */}
                        </div>




                    </div>
                    <div id='trackall-sidebar'>
                        <Text style={{color:"#FFFFFF",padding: "10px 10px"}} strong>Vehicle ID</Text>
                        <div id='vehicle-select'>
                            <Radio.Group defaultValue={"0"} buttonStyle="solid" onChange={(e:RadioChangeEvent)=>{
                                previewChangeHandler(e.target.value);
                            }}>
                                {/* <Radio.Button key={0} value={'hi'}>{'hi'}</Radio.Button> */}
                                {sourceStates.map((clientID, index) => {
                                    return <Radio.Button key={index} value={clientID}>{clientID}</Radio.Button>
                                })}
                            </Radio.Group>
                        </div>
                        <div id='trackall-vehicle-view-container'>
                            <canvas id='trackall-vehicle-view-canvas' width='300' height={200}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
// ISL END