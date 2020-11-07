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
    modelOnChange(event:any): void;
    trackerOnChange(event:any): void;
}
export default function TogglesModal(props: Props): JSX.Element {
    const {visible,
        onCancel,
        jobInstance,
        toggleAutoFit,
        toggleGlobalAttributes,
        autofitInitState,
        globalattributesInitState,
        modelOnChange,
        trackerOnChange,

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

    const options_models:string[] = ['0','1','2','3','4','5','6','7'];
    const options_tracker:string[] = ['CSRT','pysot']
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
                </Col>z
                <Col flex={9}>
                    <Text>Predict Bounding box model</Text>
                </Col>
                <Col flex={1}>

                        <Radio.Group defaultValue="0" buttonStyle="solid" onChange={modelOnChange}>
                        {options_models.map((value, index) => {
                            return <Radio.Button key={index} value={value}>{value}</Radio.Button>
                        })}
                        </Radio.Group>
                </Col>
                <Col flex={9}>
                    <Text>Tracker</Text>
                </Col>
                <Col flex={1}>

                        <Radio.Group defaultValue="CSRT" buttonStyle="solid" onChange={trackerOnChange}>
                        {options_tracker.map((value, index) => {
                            return <Radio.Button key={index} value={value}>{value}</Radio.Button>
                        })}
                        </Radio.Group>
                </Col>

        </Modal>
        </div>
    )

}
