// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';
import Button from 'antd/lib/button';

interface Props {
    visible: boolean;
    stopFrame: number;
    frameNumber: number;
    cancel(): void;
    onOk(num_frames:number):void;
    automaticTracking: any;
    onNext(frame_num:number):void;
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
    } = props;

    let num_frames_to_track = 10;

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
            <div className='cvat-track-confirm'>
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
            </div>
            <div id='track-content-container'>
                <div id='track-text-box'>
                    <InputNumber
                            size='small'
                            min={0}
                            value={automaticTracking.current}
                    />
                </div>
                <div id='track-canvas-container'>
                <img src={`http://localhost:7000/api/v1/tasks/1/data?type=frame&amp;quality=compressed&amp;number=${automaticTracking.current}`} width="1365" height="767" id='track-image' style={{display: "none"}}></img>
                        <canvas height='300' width='400' id='track-canvas'></canvas>
                </div>
                <div id='track-bottom-buttons'>
                    <div id='track-left-bottom-buttons'>
                        <Button className='btn-bottom'> Cancel </Button>
                    </div>
                    <div id='track-center-bottom-buttons'>
                        <Button className='btn-bottom'> Modify </Button>
                        <Button className='btn-bottom' onClick={
                            (event:any) => {
                                onNext(automaticTracking.current);
                                console.log('on next');
                            }
                        }> Next </Button>
                    </div>
                    <div id='track-right-bottom-buttons'>
                        <Button className='btn-bottom'> Done </Button>
                    </div>

                </div>
            </div>
        </Modal>
    );
}
