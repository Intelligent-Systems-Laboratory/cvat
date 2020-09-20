// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';
import Button from 'antd/lib/button';
import config from 'cvat-core/src/config';
import Spin from 'antd/lib/spin';

interface Props {
    visible: boolean;
    stopFrame: number;
    frameNumber: number;
    cancel(): void;
    onOk(num_frames:number):void;
    automaticTracking: any;
    onNext(frame_num:number):void;
    onPrevious(): void;
    onEditLastTrackState(drag:any,resize:any): void;
}

export default function TrackConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        stopFrame,
        frameNumber,
        cancel,
        onOk,
        automaticTracking,
        onNext,
        onPrevious,
        onEditLastTrackState,
    } = props;

    let num_frames_to_track = 10;
    const { backendAPI } = config;
    return (
        <Modal
            okType='primary'
            okText='Track'
            cancelText='Cancel'
            onOk={()=>{
                console.log('ok');
                onOk(num_frames_to_track);
            }}
            onCancel={cancel}
            title='AutoTrack'
            visible={visible}
            width = {700}
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
                            value={automaticTracking.current}
                    />
                </div>
                <div id='track-canvas-container'>
                    <Spin id={'track-loading'}></Spin>
                    <img src={`${backendAPI}/tasks/1/data?type=frame&amp;quality=compressed&amp;number=${automaticTracking.current}`} width="1365" height="767" id='track-image' style={{display: "none"}}
                        onLoad={()=>{
                            console.log(' refreshed');
                        }}></img>
                    <canvas id='track-canvas' style={{visibility: "hidden"}}></canvas>
                </div>
                <div id='track-bottom-buttons'>
                    <div id='track-left-bottom-buttons'>
                        {/* <Button className='btn-bottom'> Cancel </Button> */}
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                onPrevious();
                                console.log('on previous');
                            }
                        }> Previous </Button>

                    </div>
                    <div id='track-center-bottom-buttons'>
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                var resize={x:5,y:0};
                                var drag={x:0,y:0};
                                onEditLastTrackState(drag,resize);
                            }
                        }> Width+ </Button>
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                var resize={x:-5,y:0};
                                var drag={x:0,y:0};
                                onEditLastTrackState(drag,resize);
                            }
                        }> Width- </Button>
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                var resize={x:0,y:5};
                                var drag={x:0,y:0};
                                onEditLastTrackState(drag,resize);
                            }
                        }> Height+ </Button>
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                var resize={x:0,y:-5};
                                var drag={x:0,y:0};
                                onEditLastTrackState(drag,resize);
                            }
                        }> Height- </Button>

                    </div>
                    <div id='track-right-bottom-buttons'>
                        {/* <Button className='btn-bottom'> Done </Button> */}
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                onNext(automaticTracking.current);
                                console.log('on next');
                            }
                        }> Next </Button>
                    </div>

                </div>
            </div>
        </Modal>
    );
}
