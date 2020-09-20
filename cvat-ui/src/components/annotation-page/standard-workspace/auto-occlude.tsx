export function measureIOU(objectState1:any,objectState2:any):number{
    let bbox1 = objectState1.points;
    let bbox2 = objectState2.points;
  //bbox 1 and 2 must be formatted as follows [xtl,ytl,xbr,ybr,occluded]
  let truth_xmax = Math.max(bbox1[0],bbox1[2]);
  let truth_xmin = Math.min(bbox1[0],bbox1[2]);
  let truth_ymax = Math.max(bbox1[3],bbox1[1]);
  let truth_ymin = Math.min(bbox1[1],bbox1[3]);
  let box_xmax = Math.max(bbox2[2],bbox2[0]);
  let box_xmin = Math.min(bbox2[2],bbox2[0]);
  let box_ymax = Math.max(bbox2[3],bbox2[1]);
  let box_ymin = Math.min(bbox2[1],bbox2[3]);
  let truthArea = (truth_xmax - truth_xmin) * (truth_ymax - truth_ymin);
  let boxArea = (box_xmax - box_xmin) * (box_ymax - box_ymin);
  let leftIntersect = Math.max(truth_xmin, box_xmin);
  let rightIntersect = Math.min(truth_xmax, box_xmax);
  let bottomIntersect = Math.max(truth_ymin, box_ymin);
  let topIntersect = Math.min(truth_ymax, box_ymax);

    let IOU = 0;
  if ((rightIntersect > leftIntersect) && (topIntersect > bottomIntersect)){
      let overlapArea = (rightIntersect - leftIntersect) * (topIntersect - bottomIntersect);
      let totalArea = truthArea + boxArea - overlapArea;
      IOU = overlapArea / totalArea;
  }else{
    IOU = 0;
  }
  return IOU;
}

export function calculateDistance(point1:any,point2:any){
    let dist = Math.sqrt(Math.pow((point1[0] - point2[0]),2) + Math.pow((point1[1] - point2[1]),2));
    return dist ;
}

export function checkOccluded(objectState1:any,objectState2:any,IOU_threshold:number,POMO:any){
  //bbox 1 and 2 must be formatted as follows [xtl,ytl,xbr,ybr,occluded]
  //iou threshold must be float between 0 and 1
  // POMO or point of Math.minimal occlusion must be list [x,y]
  let bbox1 = objectState1.points;
  let bbox2 = objectState2.points;
  let IOU = measureIOU(objectState1,objectState2);
  let bbox1_center = [(bbox1[2]+bbox1[0])/2,(bbox1[1]+bbox1[3])/2]
  let bbox2_center = [(bbox2[2]+bbox2[0])/2,(bbox2[1]+bbox2[3])/2]
  if(IOU > IOU_threshold){
    if (calculateDistance(bbox1_center,POMO)>calculateDistance(bbox2_center,POMO)){
        objectState1.occluded = true;
    }
    else if(calculateDistance(bbox1_center,POMO)<calculateDistance(bbox2_center,POMO)){
        objectState2.occluded = true;
    }
  }
  return [bbox1,bbox2,IOU]
}

export function getAllOccluded(objectStates:any[]): any[]{
    let states:any[] =[];
    for (let state of states){
        for(let state2 of states){
            if(state != state2){
                let result = checkOccluded(state,state2,0.025,[960,1080]);
                state = result[0];
                state = result[1];
            }
        }
    }
    return states;
}