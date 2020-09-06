import React, { Component } from 'react'
import Modal from 'antd/lib/modal'
import Radio from 'antd/lib/radio';
import Text from 'antd/lib/typography/Text';
import Title from 'antd/lib/typography/Title';
interface Props {
    title:string,
    visible:boolean,
    handleCancel():void,
    handleOk(attributes:any):void,
    attributes:any[],
}
export default function GlobalModal(props: Props): JSX.Element {
    const {
        title,
        visible,
        handleCancel,
        handleOk,
        attributes,
    } = props;
    function onOk():void  {
        let attributes:any = {};
        handleOk(attributes);
    }
    return (
        <div>
        <Modal
          title={(<Title level={3}>Global Attributes</Title>)}
          visible={visible}
          onCancel={handleCancel}
          onOk={handleOk}
        >

                {attributes.map((attribute:any)=>{
                    return (
                    <>
                    <Title level={4}>{attribute.name}</Title>
                    <Radio.Group defaultValue="a" buttonStyle="solid">
                    {attribute.values.map((value:string,index:number)=>{
                        return <Radio.Button key={index} value={value}>{value}</Radio.Button>
                    })}
                    </Radio.Group>
                    </>
                    )
                })
                }

        </Modal>
        </div>
    )

}
