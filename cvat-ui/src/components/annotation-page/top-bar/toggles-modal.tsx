import React, { Component } from 'react'
import Modal from 'antd/lib/modal'
import Radio from 'antd/lib/radio';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
import Switch from 'antd/lib/switch'
import { Row,Col } from 'antd/lib/grid';
import { Label } from 'cvat-core/src/labels';
interface Props {
    visible:boolean,
    onCancel():void;
}
export default function TogglesModal(props: Props): JSX.Element {
    const {visible,
        onCancel
    } = props;
    function onChange(checked:boolean):void{
        console.log(checked);
    }
    return (
        <div>
        <Modal
          title={(<Title level={3}>ISL FEATURES</Title>)}
          visible={true}
          onCancel={onCancel}
        >

                <Col flex={9}>
                    <Text>AutoFit</Text>
                </Col>
                <Col flex={1}>
                    <Switch defaultChecked onChange={onChange} />
                </Col>
                <Col flex={9}>
                    <Text>Global Attributes</Text>
                </Col>
                <Col flex={1}>
                    <Switch defaultChecked onChange={onChange} />
                </Col>


        </Modal>
        </div>
    )

}
