// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT
// ISL TRACKING
// this file controls the logic and data of the modal that appears when the tracking shortcut 'y' is pressed
import React from 'react';
import { connect } from 'react-redux';

import {
    propagateObject as propagateObjectAction,
    changePropagateFrames as changePropagateFramesAction,
    propagateObjectAsync,
    switchTrackModalVisibility,
    changeNumFramesToTrack,
    switchAutoTrack,
    previousTrack,
    editLastTrackState,
    switchTrackAllModal,
    fetch,
    changeNumFramesToTrackAll
} from 'actions/annotation-actions';

import { CombinedState } from 'reducers/interfaces';
import TrackAllConfirmComponent from 'components/annotation-page/standard-workspace/trackall-confirm';
import config from 'cvat-core/src/config';

interface StateToProps {
    visible: boolean,
    framesToTrack: number,
    results: any[],
    frameStart: number,
    sourceStates: any[],
    preview: any,
    trackingStatus:boolean,
    jobInstance: any,
    annotations:any[],
    frame:number,
    loading: boolean,
}

interface DispatchToProps {
    cancel(): void;
    propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void;
    onChangeNumFramesToTrack(frames: number): void;
    onPrevious():void;
    onEditLastTrackState(drag:any,resize:any): void;
    trackAll(jobInstance: any, url:string, params:any):void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            job:{
                instance: jobInstance,
            },
            annotations: {
                states: annotations,
            },
            trackAll:{
                visible: visible,
                framesToTrack: framesToTrack,
                results: results,
                frameStart: frameStart,
                sourceStates: sourceStates,
                preview: preview,
                trackingStatus:trackingStatus,
                loading: loading,
            },
            player: {
                frame: {
                    number: frame,
                },
            },
        },
    } = state;

    return {
        visible,
        framesToTrack,
        results,
        frameStart,
        sourceStates,
        preview,
        trackingStatus,
        jobInstance,
        annotations,
        frame,
        loading,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void {
            dispatch(propagateObjectAsync(sessionInstance, objectState, from, to));
        },
        onChangeNumFramesToTrack(frames: number): void {
            dispatch(changeNumFramesToTrackAll(frames));
        },
        cancel(): void {
            dispatch(switchTrackAllModal(false));
        },
        onPrevious():void{
            dispatch(previousTrack());
        },
        onEditLastTrackState(drag:any,resize:any): void{
            dispatch(editLastTrackState(drag,resize));
        },
        trackAll(jobInstance: any, url:string, params:any|undefined=null):void{
            dispatch(fetch(jobInstance,url,params));
        }

    };
}

type Props = StateToProps & DispatchToProps;

const { backendAPI } = config;
class TrackAllConfirmContainer extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }
    public loadImage = (outputImg:HTMLImageElement|null=null):void => {
        const {
        } = this.props;

        if(outputImg==null){
            outputImg = document.getElementById('trackall-image') as HTMLImageElement;
        }
        // console.log('image width',outputImg.width);
        // console.log('image height',outputImg.height);

        // show loading
        var loading = document.getElementById('trackall-loading');
        let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;


        // var index = Math.floor((automaticTracking.current-automaticTracking.frameStart)/2)-1;
        // var points = automaticTracking.states[index]; // bounding box of the result of tracking in the current frame
        // console.log('points', points);
        // console.log('index',index);
        // console.log('points',points);
        // var width = points[2] - points[0];
        // var height = points[3] - points[1];
        // console.log('width, height',width,height);
        // for (let coord of background){
        //     // this is in the case that tracker returns negative values
        //     if (coord < 0){
        //         coord = 0
        //     }
        // }
        // fix
        const canvasMaxWidth = 1200;
        const canvasMaxHeight = canvasMaxWidth*1080/1920;

        var bboxMaxPercent = 0.8;
        var scaleFactor = 1;
        // if (height >= canvasMaxHeight*bboxMaxPercent){
        //     console.log('exceeded max height');
        //     while(height/bboxMaxPercent>canvasMaxHeight/scaleFactor){
        //         scaleFactor-=0.01;
        //     }
        // }
        if(canvas){
            canvas.width = canvasMaxWidth;
            canvas.height = canvasMaxHeight;
            // canvas.height = Math.max((1080/1920)*700+height-200,(1080/1920)*700);
            // canvas.height = 550;
            console.log('canvas width, height',canvas.width,canvas.height);
            // compute the background of the canvas since we cannot display the whole canvas
            // var bgWidth = canvas.width/scaleFactor;
            // var bgHeight = canvas.height/scaleFactor;
            // var background:number[] = [points[0]+width/2-bgWidth/2,points[1]+height/2-bgHeight/2,bgWidth,bgHeight]
            // console.log('background',background);
            let ctx = canvas.getContext('2d');
            if(ctx && outputImg){
                if(outputImg.complete){
                    ctx.drawImage(outputImg,0,0,canvas.width,canvas.height);
                }

            }

            if(loading){
                loading.style.display='none';
            }
            canvas.style.visibility ='';
        }
    }
    public draw = ():void => {
        var done = false;  // ensures the this.loadImage runs only once
        // console.log('load the image in frame ',automaticTracking.current);
        var outputImg = document.getElementById('trackall-image') as HTMLImageElement;
        if(outputImg){
            outputImg.onload = () =>{
                console.log("Image 1 ready to append");
                this.loadImage(outputImg);
                done = true;
            };
            if(!done){
                this.loadImage(outputImg);
            }
        }

    }
    public track = ():void=>{
        var loading = document.getElementById('trackall-loading');
        if(loading){
            loading.style.visibility="";
        }
        const {
            trackAll,
            jobInstance,
            sourceStates,
            annotations,
            framesToTrack,
            frame,

        } = this.props;
        var bboxes:number[][] = [];
        var ids: number[] = [];
        annotations.forEach(state => {
            bboxes.push(state.points);
            ids.push(state.clientID);
        });
        console.log(bboxes);
        const params ={
            bboxes:bboxes,
            framesToTrack: framesToTrack,
            frameStart: frame,
            ids:ids,
        }
        trackAll(jobInstance,`tasks/${jobInstance.task.id}/trackall`,params);
        console.log('start tracking all bbs');

    }

    public waitForElementToDisplay(selector:string, callback:any, checkFrequencyInMs:number, timeoutInMs:number) {
        var startTimeInMs = Date.now();
        (function loopSearch() {
            if (document.querySelector(selector) != null) {
            callback();
            return;
            }
            else {
            setTimeout(function () {
                if (timeoutInMs && Date.now() - startTimeInMs > timeoutInMs)
                return;
                loopSearch();
            }, checkFrequencyInMs);
            }
        })();
    }

    public drawResults =():void =>{
        const {
            results
        } = this.props;
        try {
            let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
            let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = "red";
            results.forEach(track=>{
                let result = track[track.length-1];
                let width = result[2]-result[0];
                let height = result[3]-result[1];
                let scaleX = 1920/canvas.width;
                let scaleY = 1080/canvas.height;
                ctx.rect(result[0]/scaleX,result[1]/scaleY,width/scaleX,height/scaleY);
            });
            ctx.stroke();
        } catch (error) {
            console.log('error');
        }

    }

    public changePreview = (clientID:number) =>{
        const{
            sourceStates,
            results,
            jobInstance,
            frameStart,
            framesToTrack
        } = this.props;
        var outputImg = document.getElementById('trackall-image') as HTMLImageElement;
        let index = sourceStates.indexOf(clientID);
        console.log('index',index);
        console.log('clientID',clientID);
        outputImg.src = `${backendAPI}/tasks/${jobInstance.task.id}/trackall?type=frame&quality=compressed&number=${frameStart+framesToTrack}&frame-start=${frameStart}&object-id=${clientID}`;
        outputImg.onload =  () => {
            console.log('onload of clientID',clientID);
            var offset = 20;
            if(index >= 0){
                let previewCanvas = window.document.getElementById('trackall-vehicle-view-canvas') as HTMLCanvasElement;
                if(previewCanvas){
                    let previewCtx = previewCanvas.getContext('2d') as CanvasRenderingContext2D;
                    previewCtx.fillStyle='gray';
                    previewCtx.fillRect(0,0,previewCanvas.width,previewCanvas.height);
                    previewCtx.stroke();
                    var outputImg = document.getElementById('trackall-image') as HTMLImageElement;
                    //draw image
                    var bbox = results[index][results[index].length-1];

                    let width = bbox[2]-bbox[0]+2*offset;
                    let height = bbox[3]-bbox[1]+2*offset;
                    let aspectRatio = height/width;
                    // console.log('aspect ratio',aspectRatio);
                    previewCanvas.height = previewCanvas.width *aspectRatio;
                    // console.log('canvas AR',previewCanvas.height/previewCanvas.width);
                    previewCtx.drawImage(outputImg,bbox[0]-offset,bbox[1]-offset,width,height,0,0,previewCanvas.width,previewCanvas.height);

                    let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
                    let ctx = canvas.getContext('2d');
                    if(ctx && outputImg){
                        ctx.drawImage(outputImg,0,0,canvas.width,canvas.height);
                        canvas.style.visibility ='';
                    }
                    }

                this.draw(); //redraw the image
                this.drawResults();
                this.changeSelected(index);
            }


        }
    }
    public changeSelected = (index:number):void =>{
        const {
            results,
        } = this.props;
        var dotSize=3;
        let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
        let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        var bbox:number[] = results[index][results[index].length-1];
        let scaleX = 1920/canvas.width;
        let scaleY = 1080/canvas.height;
        //dots outline
        ctx.strokeStyle = "#000000";
        ctx.beginPath();
        ctx.arc(bbox[0]/scaleX, bbox[1]/scaleY, dotSize+1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[0]/scaleX, bbox[3]/scaleY, dotSize+1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[2]/scaleX, bbox[1]/scaleY, dotSize+1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[2]/scaleX, bbox[3]/scaleY, dotSize+1, 0, 2 * Math.PI);
        ctx.stroke();
        //dots
        ctx.strokeStyle = "#FF0000";
        ctx.beginPath();
        ctx.arc(bbox[0]/scaleX, bbox[1]/scaleY, dotSize, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[0]/scaleX, bbox[3]/scaleY, dotSize, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[2]/scaleX, bbox[1]/scaleY, dotSize, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(bbox[2]/scaleX, bbox[3]/scaleY, dotSize, 0, 2 * Math.PI);
        ctx.stroke();




    }
    public componentDidUpdate(prevProps: Props): void {
        const {
            visible,
            results,
            sourceStates,
            framesToTrack,
            loading
        } = this.props;
        if(framesToTrack != prevProps.framesToTrack){
            console.log('framesToTrack',framesToTrack);

            if(loading){

                this.track();
                console.log('already loading');
            }
        }
        if(loading != prevProps.loading){
            console.log('loading',loading);
        }
        if(visible!=prevProps.visible && visible){
            this.track();
            this.waitForElementToDisplay("#trackall-vehicle-view-canvas",()=>{
                let previewCanvas = window.document.getElementById('trackall-vehicle-view-canvas') as HTMLCanvasElement;
                if(previewCanvas){
                    let previewCtx = previewCanvas.getContext('2d') as CanvasRenderingContext2D;
                    previewCtx.fillStyle='gray';
                    previewCtx.fillRect(0,0,previewCanvas.width,previewCanvas.height);
                    previewCtx.stroke();
                }


            },1000,9000);

        }
        if(results!=prevProps.results){
            console.log('results updated');

            this.drawResults();
            this.changePreview(sourceStates[0]);
        }
    }
    public render(): JSX.Element {
        const {
            visible,
            framesToTrack,
            results,
            frameStart,
            sourceStates,
            preview,
            trackingStatus,
            cancel,
            frame,
            onChangeNumFramesToTrack,
            jobInstance,
            loading
        } = this.props;


        return (
            <TrackAllConfirmComponent
                visible={visible}
                framesToTrack = {framesToTrack}
                frameStart = {frame}
                preview = {preview}
                results = {results}
                sourceStates = {sourceStates}
                trackingStatus = {trackingStatus}
                onCancel = {cancel}
                onOk = {this.track}
                onChangeNumFramesToTrack={onChangeNumFramesToTrack}
                jobInstance={jobInstance}
                previewChangeHandler={this.changePreview}
                loading={loading}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TrackAllConfirmContainer);
// ISL END