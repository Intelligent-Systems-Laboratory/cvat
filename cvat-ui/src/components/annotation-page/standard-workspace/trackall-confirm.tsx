// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
// ISL TRACKING
// this file controls the UI of the modal that appears when the tracking shortcut 'y' is pressed
import React,{useState} from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';
import Button from 'antd/lib/button';
import config from 'cvat-core/src/config';
import Spin from 'antd/lib/spin';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import { SettingsIcon } from 'icons';
import Icon from 'antd/lib/icon';
import Slider from 'antd/lib/slider';

import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import LoadingOverlay from 'react-loading-overlay';
import { Col , Row } from 'antd/lib/grid';

import axios from 'axios';
interface Props {
    visible: boolean,
    framesToTrack: number,
    results: any[],
    frameStart: number,
    sourceStates: any[],
    preview_objectID: any,
    trackingStatus:boolean,
    onCancel():void,
    onOk():void,
    onChangeNumFramesToTrack(frames: number): void,
    jobInstance: any,
    previewChangeHandler(clientID: number): void,
    loading:boolean,
    reload():void,
    onEditSlice(slice:number):void,
    slice:number,

}

var first_time = true;

export default function TrackAllConfirmComponent(props: Props): JSX.Element {
    const [sliderValue,setSliderValue] = useState(0);
    const [displayText,setDisplayText] = useState("Hello");
    const {
        visible,
        framesToTrack,
        results,
        frameStart,
        sourceStates,
        preview_objectID,
        trackingStatus,
        onCancel,
        onOk,
        onChangeNumFramesToTrack,
        jobInstance,
        previewChangeHandler,
        loading,
        onEditSlice,
        slice
    } = props;

    var num_frames_to_track = 30;
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
                <Text style={{color:"#000000",padding: "10px 10px"}} strong>Start</Text>
                <InputNumber
                    style={{paddingRight: "30px"}}
                    size='small'
                    min={0}
                    defaultValue={frameStart}
                    onChange={(value: number | undefined) => {
                        // if(value){
                        //     num_frames_to_track = value;
                        //     onChangeNumFramesToTrack(value);
                        // }
                    }}

                />
                <Text style={{color:"#000000",padding: "10px 10px"}} strong>End</Text>
                <InputNumber
                    size='small'
                    min={0}
                    defaultValue={30}
                    onChange={(value: number | undefined) => {
                        if(value){
                            num_frames_to_track = value;

                        }
                    }}

                />
                <Button
                    style={{marginLeft: "5px",marginBottom:"5px"}}
                    onClick={
                        (event:any) => {
                            console.log('tracking up to',num_frames_to_track);
                            onChangeNumFramesToTrack(num_frames_to_track);
                        }}
                > ok</Button>
                </div>
                <div id='trackall-body'>
                    <div id='track-canvas-container'>
                        <div id='trackall-canvas-div'>
                        {
                            // automaticTracking.jobInstance != null &&tasks/1/trackall?type=frame&quality=compressed&number=${frameStart+framesToTrack}&frame-start=0
                                <img src={`${backendAPI}/tasks/${jobInstance.task.id}/trackall?type=frame&quality=compressed&number=${frameStart+framesToTrack}&frame-start=0&slice=0`} width="1365" height="767" id='trackall-image' style={{display: "none"}}
                                    onLoad={()=>{
                                    let outputImg = document.getElementById('trackall-image') as HTMLImageElement;
                                    let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
                                    let ctx = canvas.getContext('2d');
                                    if(ctx && outputImg && first_time){
                                        ctx.drawImage(outputImg,0,0,canvas.width,canvas.height);
                                        first_time = false;
                                        canvas.style.visibility ='';
                                    }
                            }}></img>
                        }
                        <LoadingOverlay
                        active={loading}
                        spinner
                        text='Tracking'
                        >
                            <canvas id='trackall-canvas' style={{visibility: "hidden"}} width='1200' height={1200*1080/1920}></canvas>

                        </LoadingOverlay>
                        {/* <canvas id='track-canvas' ></canvas> */}
                        </div>




                    </div>
                    <div id='trackall-sidebar'>
                        <Text style={{color:"#FFFFFF",padding: "10px 10px"}} strong>Vehicle ID</Text>
                        <div id='vehicle-select'>
                            <Radio.Group defaultValue={preview_objectID} buttonStyle="solid" onChange={(e:RadioChangeEvent)=>{
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
                        <div id='decision-buttons-container'>
                                <Button className='btn-bottom' onClick={
                                    (event:any) => {
                                        var resize={x:5,y:0};
                                        var drag={x:0,y:0};
                                        // onEditLastTrackState(drag,resize);
                                    }
                                }> Edit</Button>
                                <Button className='btn-bottom' onClick={
                                    (event:any) => {
                                        var resize={x:-5,y:0};
                                        var drag={x:0,y:0};
                                        // onEditLastTrackState(drag,resize);
                                    }
                                }> Delete</Button>
                                <Button className='btn-bottom' onClick={
                                    (event:any) => {
                                        var resize={x:0,y:5};
                                        var drag={x:0,y:0};
                                        // onEditLastTrackState(drag,resize);
                                    }
                                }> Confirm </Button>
        <Row>
            <Col span={12}>
            <Slider
                min={frameStart}
                max={framesToTrack+frameStart}
                onChange={(value)=>{
                    setSliderValue(value as number);
                    var temp_slice = Math.ceil((value as number/2)-1);
                    onEditSlice(temp_slice>0?temp_slice:0);
                }
                }
                value={(slice+1)*2}
                step={1}
            />
            </Col>
            <Col span={4}>
            <InputNumber
                min={frameStart}
                max={frameStart+framesToTrack}
                style={{ margin: '0 16px' }}
                step={1}
                value={(slice+1)*2}

                onChange={(value)=>{
                    setSliderValue(value as number);}
                }
            />
            </Col>
        </Row>
        <Button className='btn-bottom' onClick={
                    (event:any) => {
                        var url = 'tasks/1/ISLconfig';
                        const username = 'admin'
                        const password = 'admin'

                        const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
                        // window.location.reload(true);
                        axios.get(`${backendAPI}/${url}`,
                        {
                            headers: {
                                'Authorization': `Basic ${token}`
                              },
                        }).then((res)=> {
                            console.log('from server', res);
                        });
                    }
        }> Test</Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
// ISL END