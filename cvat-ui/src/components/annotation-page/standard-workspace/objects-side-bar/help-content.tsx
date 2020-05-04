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
    SaveIcon,
    UndoIcon,
    RedoIcon,
    FirstIcon,
    BackJumpIcon,
    PreviousIcon,
    PlayIcon,
    PauseIcon,
    NextIcon,
    ForwardJumpIcon,
    LastIcon,
    FullscreenIcon,
    InfoIcon,
    ObjectOutsideIcon,
    BackgroundIcon,
    ForegroundIcon,
    RotateCCIcon,
} from 'icons';


class HelpList extends React.Component {
    public constructor() {
        super();
        this.state = {
            title: null,
            hotkey: null,
            icontype: null,
            description: null,
            howto: [],
            features: null,
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

        if (value === 'label') {
            this.setState({
                title: 'Easier label selection',
                hotkey: 'n/a',
                label3: 'Icon: none',
                icontype: null,
                description: 'Shows a context menu with a drop-down list of labels on the top-right corner of each box after it is drawn. This is a new feature by the DLSU ISL Lab.',
                label5: null,
                howto: [],
            });
        } else if (value === 'emphasize') {
            this.setState({
                title: 'Emphasis on object being annotated',
                hotkey: 'n/a',
                label3: 'Icon: none',
                icontype: null,
                description: 'Overlays the rest of the frame with a cyan mask once a bounding box is selected to prevent the annotator from being distracted by other options. This is a new feature by the DLSU ISL Lab.',
                label5: null,
                howto: [],
            });
        } else if (value === 'zoom') {
            this.setState({
                title: 'Zoom upon resize',
                hotkey: 'n/a',
                label3: 'Icon: none',
                icontype: null,
                description: 'Lets the user to zoom into the area around any of the eight adjusting points of a bounding box while resizing them, allowing precise manual adjustment of the boxes. This is a new feature by the DLSU ISL Lab.',
                label5: null,
                howto: [],
            });
        } else if (value === 'cursor') {
            this.setState({
                title: 'Cursor',
                hotkey: '[Esc]',
                icontype: CursorIcon,
                description: 'Allows user to track a bounding box with his mouse as it moves throughout the frame.',
                label5: null,
                howto: [],
            });
        } else if (value === 'move') {
            this.setState({
                title: 'Move the image',
                hotkey: 'n/a',
                icontype: MoveIcon,
                description: 'Moves the image being annotated by clicking and dragging it.',
                label5: null,
                howto: [],
            });
        } else if (value === 'rotatecc') {
            this.setState({
                title: 'Rotate clockwise',
                hotkey: '[Ctrl+R]',
                icontype: RotateCCIcon,
                description: 'Rotates the current frame clockwise.',
                label5: null,
                howto: [],
            });
        } else if (value === 'rotateac') {
            this.setState({
                title: 'Rotate anticlockwise',
                hotkey: '[Ctrl+Shift+R]',
                icontype: RotateIcon,
                description: 'Rotates the current frame anticlockwise.',
                label5: null,
                howto: [],
            });
        } else if (value === 'fit') {
            this.setState({
                title: 'Fit the image',
                hotkey: '[Double Click]',
                icontype: FitIcon,
                description: 'Fits the frame being annotated to the width of the screen.',
                label5: null,
                howto: [],
            });
        } else if (value === 'selectroi') {
            this.setState({
                title: 'Select a region of interest',
                hotkey: 'n/a',
                icontype: ZoomIcon,
                description: 'Click and drag over the region of interest to select it. This feature will then zoom into this region.',
                label5: null,
                howto: [],
            });
        } else if (value === 'drawrect') {
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
        } else if (value === 'drawpgon') {
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
        } else if (value === 'drawpline') {
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
        } else if (value === 'drawpts') {
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
        } else if (value === 'tag') {
            this.setState({
                title: 'Setup tag',
                hotkey: 'n/a',
                icontype: TagIcon,
                description: 'Allows user to draw a rectangular bounding box on the frame.',
                label5: null,
                howto: [],
            });
        } else if (value === 'merge') {
            this.setState({
                title: 'Merge shapes/tracks',
                hotkey: '[M]',
                icontype: MergeIcon,
                description: 'Activates or deactivates mode to merge shapes or tracks.',
                label5: null,
                howto: [],
            });
        } else if (value === 'group') {
            this.setState({
                title: 'Group shapes/tracks',
                hotkey: '[G]',
                icontype: GroupIcon,
                description: 'Activates or deactivates mode to group shapes or tracks.',
                label5: null,
                howto: [],
            });
        } else if (value === 'split') {
            this.setState({
                title: 'Split tracks',
                hotkey: 'n/a',
                icontype: SplitIcon,
                description: 'Splits the selected track into two',
                label5: null,
                howto: [],
            });
        } else if (value === 'track') {
            this.setState({
                title: 'Track rectangle with mouse',
                hotkey: '[T]',
                icontype: TrackIcon,
                description: 'Allows user to track a bounding box with his mouse as it moves throughout the frame. This is a new feature by the DLSU ISL Lab. It is also on the CVAT Controls Sidebar.',
                label5: null,
                howto: [],
            });
        } else if (value === 'save') {
            this.setState({
                title: 'Setup tag',
                hotkey: '[S]',
                icontype: SaveIcon,
                description: 'Save changes (e.g. bounding boxes and polygons drawn, keyframes adjusted) made to the task. These annotations can be exported later on.',
                label5: null,
                howto: [],
            });
        } else if (value === 'undo') {
            this.setState({
                title: 'Undo',
                hotkey: '[Ctrl+Z]',
                icontype: UndoIcon,
                description: 'Reverses the last action done by the user on the task.',
                label5: null,
                howto: [],
            });
        } else if (value === 'redo') {
            this.setState({
                title: 'Redo',
                hotkey: '[Ctrl+Y]',
                icontype: RedoIcon,
                description: 'Returns the last action done by the user on the task.',
                label5: null,
                howto: [],
            });
        } else if (value === 'first') {
            this.setState({
                title: 'Go to the first frame',
                hotkey: 'n/a',
                icontype: FirstIcon,
                description: 'Splits the selected track into two',
                label5: null,
                howto: [],
            });
        } else if (value === 'backward') {
            this.setState({
                title: 'Go back with a step',
                hotkey: '[C]',
                icontype: BackJumpIcon,
                description: 'Goes backward a step from the current frame. The default step is 10 frames, although this can be changed on the Player Settings, which can be accessed by pressing [F2].',
                label5: null,
                howto: [],
            });
        } else if (value === 'prev') {
            this.setState({
                title: 'Go back',
                hotkey: '[D]',
                icontype: PreviousIcon,
                description: 'Goes back by one frame.',
                label5: null,
                howto: [],
            });
        } else if (value === 'play') {
            this.setState({
                title: 'Play',
                hotkey: '[Space]',
                icontype: PlayIcon,
                description: 'Plays the video being annotated.',
                label5: null,
                howto: [],
            });
        } else if (value === 'pause') {
            this.setState({
                title: 'Pause',
                hotkey: '[Space]',
                icontype: PauseIcon,
                description: 'Pauses the video being annotated.',
                label5: null,
                howto: [],
            });
        } else if (value === 'next') {
            this.setState({
                title: 'Go next',
                hotkey: '[F]',
                icontype: NextIcon,
                description: '',
                label5: null,
                howto: [],
            });
        } else if (value === 'forward') {
            this.setState({
                title: 'Go next with a step',
                hotkey: '[V]',
                icontype: ForwardJumpIcon,
                description: 'Goes forward a step from the current frame. The default step is 10 frames, although this can be changed on the Player Settings, which can be accessed by pressing [F2].',
                label5: null,
                howto: [],
            });
        } else if (value === 'last') {
            this.setState({
                title: 'Go to the last frame',
                hotkey: 'n/a',
                icontype: LastIcon,
                description: 'Goes to the last frame of the video of the task being annotated.',
                label5: null,
                howto: [],
            });
        } else if (value === 'fullscreen') {
            this.setState({
                title: 'Fullscreen',
                hotkey: 'n/a',
                icontype: FullscreenIcon,
                description: 'Activates fullscreen mode on CVAT.',
                label5: null,
                howto: [],
            });
        } else if (value === 'info') {
            this.setState({
                title: 'Info',
                hotkey: 'n/a',
                icontype: InfoIcon,
                description: 'Shows a table with information regarding the task. This shows the job status (which can be either annotaion, validation, or completed), the assignee, the number of frames in the video, and statistics on each label and type of shapes/tracks used.',
                label5: null,
                howto: [],
            });
        } else if (value === 'outside') {
            this.setState({
                title: 'Switch outside property',
                hotkey: '[O]',
                icontype: ObjectOutsideIcon,
                description: 'Turns the outside property on or off. This property is activated when the object being annotated becomes too small or disappears from the frame.',
                label5: null,
                howto: [],
            });
        } else if (value === 'lock') {
            this.setState({
                title: 'Switch lock property',
                hotkey: '[L]',
                icontype: 'lock',
                description: 'Turns the lock property on or off. When activated, this property blocks modification of the shape.',
                label5: null,
                howto: [],
            });
        } else if (value === 'occluded') {
            this.setState({
                title: 'Switch occluded property',
                hotkey: '[Q,/]',
                icontype: 'team',
                description: 'Turns the occluded property on or off. This is activated when the object is partially obscured or occluded. Such shapes have dashed boundaries.',
                label5: null,
                howto: [],
            });
        } else if (value === 'hidden') {
            this.setState({
                title: 'Switch hidden property',
                hotkey: '[H]',
                icontype: 'eye-invisible',
                description: 'Turns the hidden property on or off. When activated, this hides the selected shape.',
                label5: null,
                howto: [],
            });
        } else if (value === 'keyframe') {
            this.setState({
                title: 'Switch keyframe property',
                hotkey: '[K]',
                icontype: 'star',
                description: 'Turns the keyframe property on or off. When activated, this uses the current frame as a keyframe for the selected object.',
                label5: null,
                howto: [],
            });
        } else if (value === 'pinned') {
            this.setState({
                title: 'Switch pinned property',
                hotkey: 'n/a',
                icontype: 'pushpin',
                description: 'Turns the pinned property on or off. When activated, this does not allow the selected shape to be moved. However, this shape can still be resized.',
                label5: null,
                howto: [],
            });
        } else if (value === 'copy') {
            this.setState({
                title: 'Make a copy',
                hotkey: '[Ctrl+C] and [Ctrl+V]',
                icontype: 'copy',
                description: 'Copies the selected shape, and pastes it to the location where the user clicks.',
                label5: null,
                howto: [],
            });
        } else if (value === 'propagate') {
            this.setState({
                title: 'Propagate',
                hotkey: '[Ctrl+B]',
                icontype: 'block',
                description: 'Copies the selected shape once per frame, for n consecutive frames as set by the user.',
                label5: null,
                howto: [],
            });
        } else if (value === 'background') {
            this.setState({
                title: 'To background',
                hotkey: '[-, _]',
                icontype: BackgroundIcon,
                description: 'Sends the selected shape backwards.',
                label5: null,
                howto: [],
            });
        } else if (value === 'foreground') {
            this.setState({
                title: 'To foreground',
                hotkey: '[+, =]',
                icontype: ForegroundIcon,
                description: 'Sends the selected shape forwards/',
                label5: null,
                howto: [],
            });
        } else if (value === 'remove') {
            this.setState({
                title: 'Remove',
                hotkey: '[Del, Shift+Del]',
                icontype: 'delete',
                description: 'Deletes the selected object.',
                label5: null,
                howto: [],
            });
        } else if (value === 'autosnap') {
            this.setState({
                title: 'autoSnap',
                hotkey: '[S]',
                icontype: 'import',
                description: 'Uses image processing techniques to detect the object and tighten the box around its edges. This is a new feature by the DLSU ISL Lab.',
                label5: null,
                howto: [],
            });
        }
    };

    public selectToolbar = (value): void => {
        const { Option, OptGroup } = Select;
        if (value === 'all') {
            this.setState({
                features:
                    <Select
                        showSearch
                        style={{ width: 292 }}
                        placeholder="Select a feature"
                        optionFilterProp="children"
                        onChange={this.handleChange}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        <Option value="label">Easier label selection</Option>
                        <Option value="emphasize">Emphasis on object being annotated</Option>
                        <Option value="autosnap">autoSnap</Option>
                        <Option value="zoom">Zoom upon resize</Option>
                        <Option value="track">Track rectangle with mouse</Option>
                        <Option value="cursor">Cursor</Option>
                        <Option value="move">Move the image</Option>
                        <Option value="rotatecc">Rotate clockwise</Option>
                        <Option value="rotateac">Rotate anticlockwise</Option>
                        <Option value="fit">Fit the image</Option>
                        <Option value="selectroi">Select a region of interest</Option>
                        <Option value="drawrect">Draw new rectangle</Option>
                        <Option value="drawpgon">Draw new polygon</Option>
                        <Option value="drawpline">Draw new polyline</Option>
                        <Option value="drawpts">Draw new points</Option>
                        <Option value="tag">Setup tag</Option>
                        <Option value="merge">Merge shapes/tracks</Option>
                        <Option value="group">Group shapes/tracks</Option>
                        <Option value="split">Split tracks</Option>
                        <Option value="save">Save current changes</Option>
                        <Option value="undo">Undo</Option>
                        <Option value="redo">Redo</Option>
                        <Option value="first">Go to the first frame</Option>
                        <Option value="backward">Go back with a step</Option>
                        <Option value="prev">Go back</Option>
                        <Option value="play">Play</Option>
                        <Option value="pause">Pause</Option>
                        <Option value="next">Go next</Option>
                        <Option value="forward">Go next with a step</Option>
                        <Option value="last">Go to the last frame</Option>
                        <Option value="fullscreen">Fullscreen</Option>
                        <Option value="info">Info</Option>
                        <Option value="outside">Switch outside property</Option>
                        <Option value="lock">Switch lock property</Option>
                        <Option value="occluded">Switch occluded property</Option>
                        <Option value="hidden">Switch hidden property</Option>
                        <Option value="keyframe">Switch keyframe property</Option>
                        <Option value="pinned">Switch pinned property</Option>
                        <Option value="copy">Make a copy</Option>
                        <Option value="propagate">Propagate</Option>
                        <Option value="background">To background</Option>
                        <Option value="foreground">To foreground</Option>
                        <Option value="remove">Remove</Option>
                    </Select>
            });
        } else if (value === 'isl') {
            this.setState({
                features:
                    <Select
                        showSearch
                        style={{ width: 292 }}
                        placeholder="Select a feature"
                        optionFilterProp="children"
                        onChange={this.handleChange}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        <Option value="label">Easier label selection</Option>
                        <Option value="emphasize">Emphasis on object being annotated</Option>
                        <Option value="autosnap">autoSnap</Option>
                        <Option value="zoom">Zoom upon resize</Option>
                        <Option value="track">Track rectangle with mouse</Option>
                    </Select>
            });
        } else if (value === 'controls') {
            this.setState({
                features:
                    <Select
                        showSearch
                        style={{ width: 292 }}
                        placeholder="Select a feature"
                        optionFilterProp="children"
                        onChange={this.handleChange}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        <Option value="cursor">Cursor</Option>
                        <Option value="move">Move the image</Option>
                        <Option value="rotatecc">Rotate clockwise</Option>
                        <Option value="rotateac">Rotate anticlockwise</Option>
                        <Option value="fit">Fit the image</Option>
                        <Option value="selectroi">Select a region of interest</Option>
                        <Option value="drawrect">Draw new rectangle</Option>
                        <Option value="drawpgon">Draw new polygon</Option>
                        <Option value="drawpline">Draw new polyline</Option>
                        <Option value="drawpts">Draw new points</Option>
                        <Option value="tag">Setup tag</Option>
                        <Option value="merge">Merge shapes/tracks</Option>
                        <Option value="group">Group shapes/tracks</Option>
                        <Option value="split">Split tracks</Option>
                        <Option value="track">Track rectangle with mouse</Option>
                    </Select>
            });
        } else if (value === 'top') {
            this.setState({
                features:
                    <Select
                        showSearch
                        style={{ width: 292 }}
                        placeholder="Select a feature"
                        optionFilterProp="children"
                        onChange={this.handleChange}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        <Option value="save">Save current changes</Option>
                        <Option value="undo">Undo</Option>
                        <Option value="redo">Redo</Option>
                        <Option value="first">Go to the first frame</Option>
                        <Option value="backward">Go back with a step</Option>
                        <Option value="prev">Go back</Option>
                        <Option value="play">Play</Option>
                        <Option value="pause">Pause</Option>
                        <Option value="next">Go next</Option>
                        <Option value="forward">Go next with a step</Option>
                        <Option value="last">Go to the last frame</Option>
                        <Option value="fullscreen">Fullscreen</Option>
                        <Option value="info">Info</Option>
                    </Select>
            });
        } else if (value === 'context') {
            this.setState({
                features:
                    <Select
                        showSearch
                        style={{ width: 292 }}
                        placeholder="Select a feature"
                        optionFilterProp="children"
                        onChange={this.handleChange}
                        filterOption={(input, option) =>
                            option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                    >
                        <Option value="outside">Switch outside property</Option>
                        <Option value="lock">Switch lock property</Option>
                        <Option value="occluded">Switch occluded property</Option>
                        <Option value="hidden">Switch hidden property</Option>
                        <Option value="keyframe">Switch keyframe property</Option>
                        <Option value="pinned">Switch pinned property</Option>
                        <Option value="copy">Make a copy</Option>
                        <Option value="propagate">Propagate</Option>
                        <Option value="background">To background</Option>
                        <Option value="foreground">To foreground</Option>
                        <Option value="remove">Remove</Option>
                        <Option value="autosnap">autoSnap</Option>
                    </Select>
            });
        }
    };

    render() {
        const { Option, OptGroup } = Select;

        return (
            <>
                <div className='cvat-objects-sidebar-help-header'>
                    <Tooltip title={`Type the name of the toolbar you want to know more about.`} placement='right'>
                        <Select
                            showSearch
                            style={{ width: 292 }}
                            placeholder="Select a feature"
                            optionFilterProp="children"
                            onChange={this.selectToolbar}
                            filterOption={(input, option) =>
                                option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            <Option value="all">All features</Option>
                            <Option value="isl">New ISL Features</Option>
                            <Option value="controls">Controls Sidebar</Option>
                            <Option value="top">Top Bar</Option>
                            <Option value="context">Objects Sidebar/Context Menu</Option>
                        </Select>;
                    </Tooltip>
                </div>

                <div className='cvat-objects-sidebar-help-list'>
                    <Tooltip title={`Type the name of the feature you are looking for.`} placement='right'>
                        {this.state.features}
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
                            <Icon component={this.state.icontype} height={10} width={10} />
                            <Icon type={this.state.icontype} />
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