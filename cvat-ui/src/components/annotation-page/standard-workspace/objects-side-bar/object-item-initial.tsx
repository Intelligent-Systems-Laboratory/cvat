// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Collapse from 'antd/lib/collapse';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import consts from 'consts';

import { ObjectType, ShapeType } from 'reducers/interfaces';
import { clamp } from 'utils/math';


interface ItemTopComponentProps {
    labelID: number;
    labels: any[];
    changeLabel(labelID: string): void;
}

function ItemTopComponent(props: ItemTopComponentProps): JSX.Element {
    const {
        labelID,
        labels,
        changeLabel,
    } = props;
    return (
        <Row type='flex' align='middle'>
            <Col span={12}>
                <Tooltip title='Change current label'>
                    <Select size='small' value={`${labelID}`} onChange={changeLabel}>
                        {labels.map((label: any): JSX.Element => (
                            <Select.Option key={label.id} value={`${label.id}`}>
                                {label.name}
                            </Select.Option>
                        ))}
                    </Select>
                </Tooltip>
            </Col>
        </Row>
    );
}

const ItemTop = React.memo(ItemTopComponent);

interface ItemAttributeComponentProps {
    attrInputType: string;
    attrValues: string[];
    attrValue: string;
    attrName: string;
    attrID: number;
    changeAttribute(attrID: number, value: string): void;
}

function attrIsTheSame(
    prevProps: ItemAttributeComponentProps,
    nextProps: ItemAttributeComponentProps,
): boolean {
    return nextProps.attrID === prevProps.attrID
        && nextProps.attrValue === prevProps.attrValue
        && nextProps.attrName === prevProps.attrName
        && nextProps.attrInputType === prevProps.attrInputType
        && nextProps.attrValues
            .map((value: string, id: number): boolean => prevProps.attrValues[id] === value)
            .every((value: boolean): boolean => value);
}

function ItemAttributeComponent(props: ItemAttributeComponentProps): JSX.Element {
    const {
        attrInputType,
        attrValues,
        attrValue,
        attrName,
        attrID,
        changeAttribute,
    } = props;

    if (attrInputType === 'checkbox') {
        return (
            <Col span={24}>
                <Checkbox
                    className='cvat-object-item-checkbox-attribute'
                    checked={attrValue === 'true'}
                    onChange={(event: CheckboxChangeEvent): void => {
                        const value = event.target.checked ? 'true' : 'false';
                        changeAttribute(attrID, value);
                    }}
                >
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Checkbox>
            </Col>
        );
    }

    if (attrInputType === 'radio') {
        return (
            <Col span={24}>
                <fieldset className='cvat-object-item-radio-attribute'>
                    <legend>
                        <Text strong className='cvat-text'>{attrName}</Text>
                    </legend>
                    <Radio.Group
                        size='small'
                        value={attrValue}
                        onChange={(event: RadioChangeEvent): void => {
                            changeAttribute(attrID, event.target.value);
                        }}
                    >
                        {attrValues.map((value: string): JSX.Element => (
                            <Radio key={value} value={value}>
                                {value === consts.UNDEFINED_ATTRIBUTE_VALUE
                                    ? consts.NO_BREAK_SPACE : value}
                            </Radio>
                        ))}
                    </Radio.Group>
                </fieldset>
            </Col>
        );
    }

    if (attrInputType === 'select') {
        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <Select
                        size='small'
                        onChange={(value: string): void => {
                            changeAttribute(attrID, value);
                        }}
                        value={attrValue}
                        className='cvat-object-item-select-attribute'
                    >
                        {attrValues.map((value: string): JSX.Element => (
                            <Select.Option key={value} value={value}>
                                {value === consts.UNDEFINED_ATTRIBUTE_VALUE
                                    ? consts.NO_BREAK_SPACE : value}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
            </>
        );
    }

    if (attrInputType === 'number') {
        const [min, max, step] = attrValues.map((value: string): number => +value);

        return (
            <>
                <Col span={24}>
                    <Text strong className='cvat-text'>
                        {attrName}
                    </Text>
                </Col>
                <Col span={24}>
                    <InputNumber
                        size='small'
                        onChange={(value: number | undefined): void => {
                            if (typeof (value) === 'number') {
                                changeAttribute(
                                    attrID, `${clamp(value, min, max)}`,
                                );
                            }
                        }}
                        value={+attrValue}
                        className='cvat-object-item-number-attribute'
                        min={min}
                        max={max}
                        step={step}
                    />
                </Col>
            </>
        );
    }

    return (
        <>
            <Col span={24}>
                <Text strong className='cvat-text'>
                    {attrName}
                </Text>
            </Col>
            <Col span={24}>
                <Input
                    size='small'
                    onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        changeAttribute(attrID, event.target.value);
                    }}
                    value={attrValue}
                    className='cvat-object-item-text-attribute'
                />
            </Col>
        </>
    );
}

const ItemAttribute = React.memo(ItemAttributeComponent, attrIsTheSame);


interface ItemAttributesComponentProps {
    collapsed: boolean;
    attributes: any[];
    values: Record<number, string>;
    changeAttribute(attrID: number, value: string): void;
    collapse(): void;
}

function attrValuesAreEqual(next: Record<number, string>, prev: Record<number, string>): boolean {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);

    return nextKeys.length === prevKeys.length
        && nextKeys.map((key: string): boolean => prev[+key] === next[+key])
            .every((value: boolean) => value);
}

function attrAreTheSame(
    prevProps: ItemAttributesComponentProps,
    nextProps: ItemAttributesComponentProps,
): boolean {
    return nextProps.collapsed === prevProps.collapsed
        && nextProps.attributes === prevProps.attributes
        && attrValuesAreEqual(nextProps.values, prevProps.values);
}

function ItemAttributesComponent(props: ItemAttributesComponentProps): JSX.Element {
    const {
        collapsed,
        attributes,
        values,
        changeAttribute,
        collapse,
    } = props;

    const sorted = [...attributes]
        .sort((a: any, b: any): number => a.inputType.localeCompare(b.inputType));

    return (
        <Row>
            <Collapse
                className='cvat-objects-sidebar-state-item-collapse'
                activeKey={collapsed ? [] : ['details']}
                onChange={collapse}
            >
                <Collapse.Panel
                    header={<span style={{ fontSize: '11px' }}>Details</span>}
                    key='details'
                >
                    {sorted.map((attribute: any): JSX.Element => (
                        <Row
                            key={attribute.id}
                            type='flex'
                            align='middle'
                            justify='start'
                            className='cvat-object-item-attribute-wrapper'
                        >
                            <ItemAttribute
                                attrValue={values[attribute.id]}
                                attrInputType={attribute.inputType}
                                attrName={attribute.name}
                                attrID={attribute.id}
                                attrValues={attribute.values}
                                changeAttribute={changeAttribute}
                            />
                        </Row>
                    ))}
                </Collapse.Panel>
            </Collapse>
        </Row>
    );
}

const ItemAttributes = React.memo(ItemAttributesComponent, attrAreTheSame);

interface Props {
    normalizedKeyMap: Record<string, string>;
    activated: boolean;
    objectType: ObjectType;
    shapeType: ShapeType;
    clientID: number;
    serverID: number | undefined;
    labelID: number;
    occluded: boolean;
    outside: boolean | undefined;
    locked: boolean;
    pinned: boolean;
    hidden: boolean;
    keyframe: boolean | undefined;
    attrValues: Record<number, string>;
    color: string;
    colors: string[];

    labels: any[];
    attributes: any[];
    collapsed: boolean;
    navigateFirstKeyframe: null | (() => void);
    navigatePrevKeyframe: null | (() => void);
    navigateNextKeyframe: null | (() => void);
    navigateLastKeyframe: null | (() => void);

    activate(): void;
    copy(): void;
    propagate(): void;
    createURL(): void;
    toBackground(): void;
    toForeground(): void;
    remove(): void;
    setOccluded(): void;
    unsetOccluded(): void;
    setOutside(): void;
    unsetOutside(): void;
    setKeyframe(): void;
    unsetKeyframe(): void;
    lock(): void;
    unlock(): void;
    pin(): void;
    unpin(): void;
    hide(): void;
    show(): void;
    changeLabel(labelID: string): void;
    changeAttribute(attrID: number, value: string): void;
    changeColor(color: string): void;
    collapse(): void;
}

function objectItemsAreEqual(prevProps: Props, nextProps: Props): boolean {
    return nextProps.activated === prevProps.activated
        && nextProps.locked === prevProps.locked
        && nextProps.pinned === prevProps.pinned
        && nextProps.occluded === prevProps.occluded
        && nextProps.outside === prevProps.outside
        && nextProps.hidden === prevProps.hidden
        && nextProps.keyframe === prevProps.keyframe
        && nextProps.labelID === prevProps.labelID
        && nextProps.color === prevProps.color
        && nextProps.clientID === prevProps.clientID
        && nextProps.serverID === prevProps.serverID
        && nextProps.objectType === prevProps.objectType
        && nextProps.shapeType === prevProps.shapeType
        && nextProps.collapsed === prevProps.collapsed
        && nextProps.labels === prevProps.labels
        && nextProps.attributes === prevProps.attributes
        && nextProps.normalizedKeyMap === prevProps.normalizedKeyMap
        && nextProps.navigateFirstKeyframe === prevProps.navigateFirstKeyframe
        && nextProps.navigatePrevKeyframe === prevProps.navigatePrevKeyframe
        && nextProps.navigateNextKeyframe === prevProps.navigateNextKeyframe
        && nextProps.navigateLastKeyframe === prevProps.navigateLastKeyframe
        && attrValuesAreEqual(nextProps.attrValues, prevProps.attrValues);
}

function ObjectItemInitialComponent(props: Props): JSX.Element {
    const {
        activated,
        objectType,
        shapeType,
        attrValues,
        labelID,
        color,

        attributes,
        labels,
        collapsed,

        activate,
        changeLabel,
        changeAttribute,
        collapse,
    } = props;

    const type = objectType === ObjectType.TAG ? ObjectType.TAG.toUpperCase()
        : `${shapeType.toUpperCase()} ${objectType.toUpperCase()}`;

    const className = !activated ? 'cvat-objects-sidebar-state-item'
        : 'cvat-objects-sidebar-state-item cvat-objects-sidebar-state-active-item';

    return (
        <div
            onMouseEnter={activate}
            style={{ borderColor: ` ${color}` }}
        >
            <ItemTop
                labelID={labelID}
                labels={labels}
                changeLabel={changeLabel}
            />
        </div>
    );
}

export default React.memo(ObjectItemInitialComponent, objectItemsAreEqual);
