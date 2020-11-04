import React, { Component } from 'react'
import Modal from 'antd/lib/modal'
import Radio from 'antd/lib/radio';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Switch from 'antd/lib/switch'
import { Row,Col } from 'antd/lib/grid';
import { Label } from 'cvat-core/src/labels';
import { autoFit } from 'actions/annotation-actions';
interface Props {
    visible:boolean,
    onCancel():void;
    jobInstance:any;
    toggleAutoFit(jobInstance:any,value:boolean):void;
    toggleGlobalAttributes(jobInstance:any,value:boolean):void;
    autofitInitState:boolean;
    globalattributesInitState: boolean;
}
export default function TogglesModal(props: Props): JSX.Element {
    const {visible,
        onCancel,
        jobInstance,
        toggleAutoFit,
        toggleGlobalAttributes,
        autofitInitState,
        globalattributesInitState,
    } = props;
    function toggleAF(checked:boolean):void{
        console.log('toggle Autofit ',checked);
        toggleAutoFit(jobInstance,checked);
    }
    function toggleGA(checked:boolean):void{
        console.log('toggle attributes ',checked);
        console.log(jobInstance);

        toggleGlobalAttributes(jobInstance,checked);
    }
    return (
        <div>
        <Modal
          title={(<Title level={3}>ISL FEATURES</Title>)}
          visible={visible}
          onCancel={onCancel}
          onOk={onCancel}
        >

                <Col flex={9}>
                    <Text>AutoFit</Text>
                </Col>
                <Col flex={1}>
                    <Switch defaultChecked={autofitInitState} onChange={toggleAF} />
                </Col>
                <Col flex={9}>
                    <Text>Global Attributes</Text>
                </Col>
                <Col flex={1}>
                    <Switch defaultChecked={globalattributesInitState} onChange={toggleGA} />
                </Col>


        </Modal>
        </div>
    )

}
