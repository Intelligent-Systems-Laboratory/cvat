// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

import Modal from 'antd/lib/modal';
import InputNumber from 'antd/lib/input-number';
import Text from 'antd/lib/typography/Text';
import { clamp } from 'utils/math';

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
            title='Confirm propagation'
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
        </Modal>
    );
}
