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
    changeNumFramesToTrackAll,
    changePreviewObjectID,
    editTrackAllResults
} from 'actions/annotation-actions';

import { CombinedState } from 'reducers/interfaces';
import TrackAllConfirmComponent from 'components/annotation-page/standard-workspace/trackall-confirm';
import config from 'cvat-core/src/config';
import { result } from 'lodash';

interface StateToProps {
    visible: boolean,
    framesToTrack: number,
    results: any[],
    frameStart: number,
    sourceStates: any[],
    selectedObjectID: any,
    trackingStatus:boolean,
    jobInstance: any,
    annotations:any[],
    frame:number,
    loading: boolean,
    mode: string,
}

interface DispatchToProps {
    cancel(): void;
    propagateObject(sessionInstance: any, objectState: any, from: number, to: number): void;
    onChangeNumFramesToTrack(frames: number): void;
    onPrevious():void;
    onEditLastTrackState(drag:any,resize:any): void;
    trackAll(jobInstance: any, url:string, params:any):void;
    onChangePreviewObjectID(objectID:number):void;
    onEditTrackAllResults(drag:any,index:number,slice:number):void;
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
                selectedObjectID: selectedObjectID,
                trackingStatus:trackingStatus,
                loading: loading,
                mode: mode,
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
        selectedObjectID,
        trackingStatus,
        jobInstance,
        annotations,
        frame,
        loading,
        mode
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
        },
        onChangePreviewObjectID(objectID:number):void{
            dispatch(changePreviewObjectID(objectID));
        },
        onEditTrackAllResults(drag:any,index:number,slice:number):void{
            dispatch(editTrackAllResults(drag,index,slice));
        }

    };
}

type Props = StateToProps & DispatchToProps;

const { backendAPI } = config;
class TrackAllConfirmContainer extends React.PureComponent<Props> {

    constructor(props: Props) {
        super(props);
        this.attachCanvasMouseListenersOnLoad();
    }
    public canvas = document.getElementById("trackall-canvas") as HTMLCanvasElement;
    public context:any;
    public dragging = false;
    // for the local copy
    public dragStart:any;
    public dragEnd:any;

    // for the global copy
    public dragInitial:any;
    public dragFinal:any;


    public scaleX:number=1;
    public scaleY:number=1;
    public results_local:any={};

    updateLocal(drag: { x: number; y: number; }) {
        const {
            sourceStates,
            selectedObjectID,
            results
        } = this.props;


        drag.x *=this.scaleX;
        drag.y *=this.scaleY;
        var index = sourceStates.indexOf(selectedObjectID);
        console.log('objectID to be edited',selectedObjectID);
        console.log('drag:',drag);
        console.log('index to be edited:',index);
        var indexToEdit = this.results_local[index].length-1;
        var bbox = this.results_local[index][indexToEdit];
        bbox[0]+=drag.x;
        bbox[1]+=drag.y;
        bbox[2]+=drag.x;
        bbox[3]+=drag.y;
        this.draw();
        this.drawResults();
    }

    private attachCanvasMouseListenersOnLoad = (): void => {

        var verbose:boolean = false;
        // this function is required in order to catch the DOM element that we are waiting, in this case the trackall-canvas
        // for some reason document.getElementById('trackall-canvas') returns null even when the modal is being shown
        // this could be because the modal is shown in asynchronously and is not using the main thread
            this.canvas = document.getElementById("trackall-canvas") as HTMLCanvasElement;
            if(this.canvas){
                this.scaleX = 1920/this.canvas.width;
                this.scaleY = 1080/this.canvas.height;
                this.context = this.canvas.getContext('2d');
                this.canvas.addEventListener('mousedown', (event:any) => {

                    this.dragStart = {
                        x: event.pageX - this.canvas.offsetLeft,
                        y: event.pageY - this.canvas.offsetTop
                    }

                    this.dragInitial = {
                        x: event.pageX - this.canvas.offsetLeft,
                        y: event.pageY - this.canvas.offsetTop
                    }

                    this.dragging = true;
                    if(verbose){
                        console.log('track canvas mousedown');
                        console.log(this.dragStart);
                    }

                });

                this.canvas.addEventListener('mousemove', (event:any) => {
                    if (this.dragging) {

                    this.dragEnd = {
                        x: event.pageX - this.canvas.offsetLeft,
                        y: event.pageY - this.canvas.offsetTop
                    }
                    // this.context.translate(this.dragEnd.x - this.dragStart.x, this.dragEnd.y - this.dragStart.y);
                    // console.log('dragging. x: ',this.dragEnd.x,'y:',this.dragEnd.y);
                    var drag = {
                        x:this.dragEnd.x-this.dragStart.x,
                        y:this.dragEnd.y-this.dragStart.y,
                    };
                    var resize = {
                        x:0,
                        y:0,
                    }
                    // this.loadImage();
                    this.dragStart=this.dragEnd;

                    this.updateLocal(drag);
                    }
                });
                this.canvas.addEventListener('mouseup', (event:any) => {
                    if(verbose)
                    console.log('track canvas up');
                    this.dragFinal = {
                        x: event.pageX - this.canvas.offsetLeft,
                        y: event.pageY - this.canvas.offsetTop
                    }

                    this.dragging = false;
                    console.log('dragged (final). x: ',this.dragFinal.x-this.dragInitial.x,'y:',this.dragFinal.y-this.dragInitial.y);

                    if(verbose){
                        console.log('dragstart',this.dragStart);
                        console.log('dragend',this.dragEnd);
                        console.log('dragged. x: ',this.dragEnd.x-this.dragStart.x,'y:',this.dragEnd.y-this.dragStart.y);
                    }
                    var drag = {
                        x:this.dragFinal.x-this.dragInitial.x,
                        y:this.dragFinal.y-this.dragInitial.y,
                    };
                    this.updateTracks(drag);
                });
            }else{
                setTimeout(this.attachCanvasMouseListenersOnLoad, 300);
            }
    }
    private updateTracks = (drag:any):void => {
        const {
            onEditTrackAllResults,
            sourceStates,
            selectedObjectID,
            results
        } = this.props;


        drag.x *=this.scaleX;
        drag.y *=this.scaleY;
        var index = sourceStates.indexOf(selectedObjectID);
        console.log('objectID to be edited',selectedObjectID);
        console.log('drag:',drag);
        console.log('index to be edited:',index);
        var indexToEdit = results[index].length-1;
        onEditTrackAllResults(drag,index,indexToEdit);
    }
    public loadImage = (outputImg:HTMLImageElement|null=null):void => {
        const {
        } = this.props;

        if(outputImg==null){
            outputImg = document.getElementById('trackall-image') as HTMLImageElement;
        }

        // show loading
        var loading = document.getElementById('trackall-loading');
        let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;

        const canvasMaxWidth = 1200;
        const canvasMaxHeight = canvasMaxWidth*1080/1920;

        var bboxMaxPercent = 0.8;
        var scaleFactor = 1;
        if(canvas){
            canvas.width = canvasMaxWidth;
            canvas.height = canvasMaxHeight;
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
    public track = (mode:string):void=>{
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
            results
        } = this.props;
        var bboxes:number[][] = [];
        var ids: number[] = [];
        annotations.forEach(state => {
            bboxes.push(state.points);
            ids.push(state.clientID);
        });
        console.log(bboxes);
        var params:any={};
        if(mode == "NORMAL"||mode=="APPEND"){
            params ={
                bboxes:bboxes,
                framesToTrack: framesToTrack,
                frameStart: frame,
                ids:ids,
                mode:mode,
            }
        }else if (mode == "EDIT"){
            params ={
                bboxes:bboxes,
                framesToTrack: framesToTrack,
                frameStart: frame,
                ids:ids,
                mode:mode,
                tracks:results
            }
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
            sourceStates
        } = this.props;
        var results = this.results_local;
        try {
            let canvas = window.document.getElementById('trackall-canvas') as HTMLCanvasElement;
            let ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = "red";
            var i=0;
            results.forEach((track: string | any[])=>{
                let result = track[track.length-1];
                let width = result[2]-result[0];
                let height = result[3]-result[1];
                let scaleX = 1920/canvas.width;
                let scaleY = 1080/canvas.height;
                ctx.rect(result[0]/scaleX,result[1]/scaleY,width/scaleX,height/scaleY);
                ctx.font = "30px Arial";
                ctx.textAlign = "center";
                ctx.fillStyle = "red";
                ctx.fillText(`${sourceStates[i]}`, (result[0]+width/2)/(scaleX), (result[1]+height/2+15)/(scaleY));
                i++;
            });
            ctx.stroke();
        } catch (error) {
            console.log('error',error);
        }

    }

    public changePreview = (clientID:number) =>{
        const{
            sourceStates,
            jobInstance,
            frameStart,
            framesToTrack,
            onChangePreviewObjectID,
            selectedObjectID,
        } = this.props;
        var results = this.results_local;
        onChangePreviewObjectID(clientID);
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
                this.changeSelected();
            }


        }
    }
    public changeSelected = ():void =>{
        const {
            results,
            selectedObjectID,
            sourceStates
        } = this.props;
        var index = sourceStates.indexOf(selectedObjectID);
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
            loading,
            selectedObjectID,
            mode
        } = this.props;
        if(framesToTrack != prevProps.framesToTrack){
            console.log('framesToTrack',framesToTrack);

            if(loading){
                this.track('APPEND');
                console.log('already loading');
            }
        }
        if(loading != prevProps.loading){
            console.log('loading',loading);
        }
        if(visible!=prevProps.visible && visible){
            this.track('NORMAL');
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
            this.results_local= results.map(function(arr){
                return arr.map(function(arr: any[]){
                    return arr.slice();
                });
            });
            console.log(this.results_local);
            console.log('results updated');
            console.log('mode',mode);
            this.draw();
            this.drawResults();
            if(mode=="APPEND" || mode=="NORMAL"){

                this.changePreview(selectedObjectID);
            }
            else if(mode == "EDIT"){
                this.changeSelected();
            }

        }
    }
    public render(): JSX.Element {
        const {
            visible,
            framesToTrack,
            results,
            frameStart,
            sourceStates,
            selectedObjectID,
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
                preview_objectID = {selectedObjectID}
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