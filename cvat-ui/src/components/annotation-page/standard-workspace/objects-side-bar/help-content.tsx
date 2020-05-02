// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';
import {
    CursorIcon,
    MoveIcon,
    RotateIcon,
    FitIcon,
    ZoomIcon,
    RectangleIcon,
    PolygonIcon,
    PolylineIcon,
    PointIcon,
    TagIcon,
    MergeIcon,
    GroupIcon,
    SplitIcon,
    TrackIcon,
} from 'icons';
const { Option, OptGroup } = Select;


class HelpList extends React.Component {
    public constructor() {
        super();
        this.state = {
            title: null,
            hotkey: null,
            icontype: null,
            description: null,
            howto: [],
            label1: null,
            label2: null,
            label3: null,
            label4: null,
            label5: null,
        };
    }

    public handleChange = (value): void => {
        this.setState({
            label1: 'Feature name: ',
            label2: 'Hotkey: ',
            label3: 'Icon: ',
            label4: 'Description: ',
        });

        if (value === 'Cursor') {
            this.setState({
                title: 'Cursor',
                hotkey: '[Esc]',
                icontype: CursorIcon,
                description: 'Allows user to track a bounding box with his mouse as it moves throughout the frame.',
            });
        } else if (value === 'Move') {
            this.setState({
                title: 'Move the image',
                hotkey: 'n/a',
                icontype: MoveIcon,
                description: 'Moves the image being annotated by clicking and dragging it.',
            });
        } else if (value === 'RotateCC') {
            this.setState({
                title: 'Rotate clockwise',
                hotkey: '[Ctrl+R]',
                icontype: RotateIcon,
                description: 'Rotates the current frame clockwise.',
            });
        } else if (value === 'RotateAC') {
            this.setState({
                title: 'Rotate anticlockwise',
                hotkey: '[Ctrl+Shift+R]',
                icontype: RotateIcon,
                description: 'Rotates the current frame anticlockwise.',
            });
        } else if (value === 'Fit') {
            this.setState({
                title: 'Fit the image',
                hotkey: '[Double Click]',
                icontype: FitIcon,
                description: 'Fits the frame being annotated to the width of the screen.',
            });
        } else if (value === 'SelectROI') {
            this.setState({
                title: 'Select a region of interest',
                hotkey: 'n/a',
                icontype: ZoomIcon,
                description: 'Click and drag over the region of interest to select it. This feature will then zoom into this region.',
            });
        } else if (value === 'DrawRect') {
            this.setState({
                title: 'Draw new rectangle',
                hotkey: '[N]',
                icontype: RectangleIcon,
                description: 'Allows user to draw a rectangular bounding box on the frame.',
                label5: 'How to use: ',
                howto: [
                    'If using the icon on the controls sidebar: ',
                    '(1) Hover over the icon',
                    '(2) Select the desired label',
                    '(3) Select the drawing method',
                    '- Two points: User will have to click and drag on the area to draw',
                    '- Four points: User will click on the four corners, from which the rectangle will be drawn',
                    '(4) Select whether shape or track',
                    '- Shape will merely draw the rectangle',
                    '- Track will interpolate the path of the rectangle in between keyframes',
                    '(5) Draw the rectangle',
                ]
            });
        } else if (value === 'DrawPGon') {
            this.setState({
                title: 'Draw new polygon',
                hotkey: '[N]',
                icontype: PolygonIcon,
                description: 'Allows the user to draw a polygon on the frame.',
                label5: 'How to use: ',
                howto: [
                    'If using the icon on the controls sidebar: ',
                    '(1) Hover over the icon',
                    '(2) Select the desired label',
                    '(3) Input the number of vertices of the desired polygon',
                    '(4) Click on the \'Shape\' button',
                    '(5) Draw the polygon by clicking on the locations where you intend to place the vertices',
                ]
            });
        } else if (value === 'DrawPLine') {
            this.setState({
                title: 'Draw new polyline',
                hotkey: '[N]',
                icontype: PolylineIcon,
                description: 'Allows the user to draw a polyline on the frame.',
                label5: 'How to use: ',
                howto: [
                    'If using the icon on the controls sidebar: ',
                    '(1) Hover over the icon',
                    '(2) Select the desired label',
                    '(3) Input the desired number of points for the polyline',
                    '(4) Click on the \'Shape\' button',
                    '(5) Click on the points where you want each vertex of the polyline to be located',
                ]
            });
        } else if (value === 'DrawPts') {
            this.setState({
                title: 'Draw new points',
                hotkey: '[N]',
                icontype: PointIcon,
                description: 'Allows the user to draw a number of points on the frame.',
                label5: 'How to use: ',
                howto: [
                    'If using the icon on the controls sidebar: ',
                    '(1) Hover over the icon',
                    '(2) Select the desired label',
                    '(3) Input the desired number of points to be drawn',
                    '(4) Click on the \'Shape\' button',
                    '(5) Click on the locations where you want to place the points',
                ]
            });
        } else if (value === 'Tag') {
            this.setState({
                title: 'Setup tag',
                hotkey: 'n/a',
                icontype: TagIcon,
                description: 'Allows user to draw a rectangular bounding box on the frame.',
            });
        } else if (value === 'Merge') {
            this.setState({
                title: 'Merge shapes/tracks',
                hotkey: '[M]',
                icontype: MergeIcon,
                description: 'Activates or deactivates mode to merge shapes or tracks.',
            });
        } else if (value === 'Group') {
            this.setState({
                title: 'Group shapes/tracks',
                hotkey: '[G]',
                icontype: GroupIcon,
                description: 'Activates or deactivates mode to group shapes or tracks.',
            });
        } else if (value === 'Split') {
            this.setState({
                title: 'Split tracks',
                hotkey: 'n/a',
                icontype: SplitIcon,
                description: 'Splits the selected track into two',
            });
        } else if (value === 'Track') {
            this.setState({
                title: 'Track shape',
                hotkey: '[T]',
                icontype: TrackIcon,
                description: 'Allows user to track a bounding box with his mouse as it moves throughout the frame.',
            });
        }
    };

    render() {
        return (
            <>
                <div className='cvat-objects-sidebar-help-header'>
                    <Tooltip title={`Type the name of the feature you are looking for.`} placement='right'>
                        <Select showSearch
                            style={{ width: 292 }}
                            placeholder="Select a feature"
                            optionFilterProp="children"
                            onChange={this.handleChange}
                            filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
                            <OptGroup label="Controls Sidebar">
                                <Option value="Cursor">Cursor</Option>
                                <Option value="Move">Move the image</Option>
                                <Option value="RotateCC">Rotate clockwise</Option>
                                <Option value="RotateAC">Rotate anticlockwise</Option>
                                <Option value="Fit">Fit the image</Option>
                                <Option value="SelectROI">Select a region of interest</Option>
                                <Option value="DrawRect">Draw new rectangle</Option>
                                <Option value="DrawPGon">Draw new polygon</Option>
                                <Option value="DrawPLine">Draw new polyline</Option>
                                <Option value="DrawPts">Draw new points</Option>
                                <Option value="Tag">Setup tag</Option>
                                <Option value="Merge">Merge shapes/tracks</Option>
                                <Option value="Group">Group shapes/tracks</Option>
                                <Option value="Split">Split tracks</Option>
                                <Option value="Track">Track shape</Option>
                            </OptGroup>
                        </Select>
                    </Tooltip>
                </div>

                <div className='cvat-objects-sidebar-help-content'>
                    <Row>
                        <Col span={30}>
                            <Text strong style={{ fontSize: 16 }}>{this.state.label1}</Text>
                            <Text style={{ fontSize: 16 }}>{this.state.title}</Text>
                            <br />
                            <Text strong style={{ fontSize: 16 }}>{this.state.label2}</Text>
                            <Text style={{ fontSize: 16 }}>{this.state.hotkey}</Text>
                            <br />
                            <Text strong style={{ fontSize: 16 }}>{this.state.label3}</Text>
                            <Icon component={this.state.icontype} />
                            <br />
                            <Text strong style={{ fontSize: 16 }}>{this.state.label4}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.description}</Text>
                            <br />
                            <Text strong style={{ fontSize: 16 }}>{this.state.label5}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[0]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[1]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[2]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[3]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[4]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[5]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[6]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[7]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[8]}</Text>
                            <br />
                            <Text style={{ fontSize: 14 }}>{this.state.howto[9]}</Text>
                        </Col>
                    </Row>
                </div>
            </>
        );
    }
}

export default React.memo(HelpList);