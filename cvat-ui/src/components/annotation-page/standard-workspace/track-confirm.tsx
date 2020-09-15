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
}

export default function TrackConfirmComponent(props: Props): JSX.Element {
    const {
        visible,
        stopFrame,
        frameNumber,
        cancel,
        onOk,
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
        >
            <div className='cvat-propagate-confirm'>
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
                            value={frameNumber}
                    />
                </div>
                <div id='track-canvas-container'>
                        <canvas height='300' width='400' id='track-canvas'></canvas>
                </div>
                <div id='track-bottom-buttons'>
                    <div id='track-left-bottom-buttons'>
                        <Button className='btn-bottom'> Cancel </Button>
                    </div>
                    <div id='track-center-bottom-buttons'>
                        <Button className='btn-bottom'> Modify </Button>
                        <Button className='btn-bottom'> Next </Button>
                    </div>
                    <div id='track-right-bottom-buttons'>
                        <Button className='btn-bottom'> Done </Button>
                    </div>

                </div>
            </div>
        </Modal>
    );
}
