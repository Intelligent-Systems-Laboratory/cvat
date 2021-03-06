# Copyright (C) 2018-2020 Intel Corporation
#
# SPDX-License-Identifier: MIT

import os
import os.path as osp
import shutil
import traceback
from datetime import datetime
from distutils.util import strtobool
from tempfile import mkstemp

import django_rq
from django.apps import apps
from django.conf import settings
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_filters import rest_framework as filters
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.inspectors import CoreAPICompatInspector, NotHandled
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from sendfile import sendfile

import cvat.apps.dataset_manager as dm
import cvat.apps.dataset_manager.views # pylint: disable=unused-import
from cvat.apps.authentication import auth
from cvat.apps.dataset_manager.serializers import DatasetFormatsSerializer
from cvat.apps.engine.frame_provider import FrameProvider
from cvat.apps.engine.models import Job, StatusChoice, Task, StorageMethodChoice
from cvat.apps.engine.serializers import (
    AboutSerializer, AnnotationFileSerializer, BasicUserSerializer,
    DataMetaSerializer, DataSerializer, ExceptionSerializer,
    FileInfoSerializer, JobSerializer, LabeledDataSerializer,
    LogEventSerializer, ProjectSerializer, RqStatusSerializer,
    TaskSerializer, UserSerializer, PluginsSerializer,
    ISLConfigSerializer # ISL FEATURES TOGGLE
)
from cvat.apps.engine.utils import av_scan_paths

from . import models, task
from .log import clogger, slogger


# ISL AUTOFIT
import cvat.apps.engine.grabcut as grabcut # autofit algorithm
from PIL import Image
import numpy as np
# ISL END

from cvat.apps.engine.tracker import Tracker,TrackResultsStorage# ISL TRACKING
from cvat.apps.engine.efficientcut import efficientcut #ISL EFFICIENTCUT

import json # ISL GLOBAL ATTRIBUTES
import time # ISL TESTING

# mabe start
from configparser import ConfigParser
config = ConfigParser()
path = os.path.abspath("./")
config_path = os.path.join(path,'cvat/apps/engine/config.ini')
config.read(config_path)
# mabe end
# mabe predict bbs
from cvat.apps.engine.predict import predict
# mabe end

# mabe trackall
import io
import cv2
from math import floor
previews = []
storage = TrackResultsStorage()
# mabe end

# drf-yasg component doesn't handle correctly URL_FORMAT_OVERRIDE and
# send requests with ?format=openapi suffix instead of ?scheme=openapi.
# We map the required paramater explicitly and add it into query arguments
# on the server side.
current_milli_time = lambda: int(round(time.time() * 1000))

class ServerViewSet(viewsets.ViewSet):
    serializer_class = None

    # To get nice documentation about ServerViewSet actions it is necessary
    # to implement the method. By default, ViewSet doesn't provide it.
    def get_serializer(self, *args, **kwargs):
        pass

    @staticmethod
    @swagger_auto_schema(method='get', operation_summary='Method provides basic CVAT information',
        responses={'200': AboutSerializer})
    @action(detail=False, methods=['GET'], serializer_class=AboutSerializer)
    def about(request):
        from cvat import __version__ as cvat_version
        about = {
            "name": "Computer Vision Annotation Tool",
            "version": cvat_version,
            "description": "CVAT is completely re-designed and re-implemented " +
                "version of Video Annotation Tool from Irvine, California " +
                "tool. It is free, online, interactive video and image annotation " +
                "tool for computer vision. It is being used by our team to " +
                "annotate million of objects with different properties. Many UI " +
                "and UX decisions are based on feedbacks from professional data " +
                "annotation team."
        }
        serializer = AboutSerializer(data=about)
        if serializer.is_valid(raise_exception=True):
            return Response(data=serializer.data)

    @staticmethod
    @swagger_auto_schema(method='post', request_body=ExceptionSerializer)
    @action(detail=False, methods=['POST'], serializer_class=ExceptionSerializer)
    def exception(request):
        """
        Saves an exception from a client on the server

        Sends logs to the ELK if it is connected
        """
        serializer = ExceptionSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            additional_info = {
                "username": request.user.username,
                "name": "Send exception",
            }
            message = JSONRenderer().render({**serializer.data, **additional_info}).decode('UTF-8')
            jid = serializer.data.get("job_id")
            tid = serializer.data.get("task_id")
            if jid:
                clogger.job[jid].error(message)
            elif tid:
                clogger.task[tid].error(message)
            else:
                clogger.glob.error(message)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @staticmethod
    @swagger_auto_schema(method='post', request_body=LogEventSerializer(many=True))
    @action(detail=False, methods=['POST'], serializer_class=LogEventSerializer)
    def logs(request):
        """
        Saves logs from a client on the server

        Sends logs to the ELK if it is connected
        """
        serializer = LogEventSerializer(many=True, data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = { "username": request.user.username }
            for event in serializer.data:
                message = JSONRenderer().render({**event, **user}).decode('UTF-8')
                jid = event.get("job_id")
                tid = event.get("task_id")
                if jid:
                    clogger.job[jid].info(message)
                elif tid:
                    clogger.task[tid].info(message)
                else:
                    clogger.glob.info(message)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @staticmethod
    @swagger_auto_schema(
        method='get', operation_summary='Returns all files and folders that are on the server along specified path',
        manual_parameters=[openapi.Parameter('directory', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Directory to browse')],
        responses={'200' : FileInfoSerializer(many=True)}
    )
    @action(detail=False, methods=['GET'], serializer_class=FileInfoSerializer)
    def share(request):
        param = request.query_params.get('directory', '/')
        if param.startswith("/"):
            param = param[1:]
        directory = os.path.abspath(os.path.join(settings.SHARE_ROOT, param))

        if directory.startswith(settings.SHARE_ROOT) and os.path.isdir(directory):
            data = []
            content = os.scandir(directory)
            for entry in content:
                entry_type = None
                if entry.is_file():
                    entry_type = "REG"
                elif entry.is_dir():
                    entry_type = "DIR"

                if entry_type:
                    data.append({"name": entry.name, "type": entry_type})

            serializer = FileInfoSerializer(many=True, data=data)
            if serializer.is_valid(raise_exception=True):
                return Response(serializer.data)
        else:
            return Response("{} is an invalid directory".format(param),
                status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    @swagger_auto_schema(method='get', operation_summary='Method provides the list of supported annotations formats',
        responses={'200': DatasetFormatsSerializer()})
    @action(detail=False, methods=['GET'], url_path='annotation/formats')
    def annotation_formats(request):
        data = dm.views.get_all_formats()
        return Response(DatasetFormatsSerializer(data).data)

    @staticmethod
    @swagger_auto_schema(method='get', operation_summary='Method provides allowed plugins.',
        responses={'200': PluginsSerializer()})
    @action(detail=False, methods=['GET'], url_path='plugins', serializer_class=PluginsSerializer)
    def plugins(request):
        response = {
            'GIT_INTEGRATION': apps.is_installed('cvat.apps.dataset_repo'),
            'ANALYTICS':       False,
            'MODELS':          False,
        }
        if strtobool(os.environ.get("CVAT_ANALYTICS", '0')):
            response['ANALYTICS'] = True
        if strtobool(os.environ.get("CVAT_SERVERLESS", '0')):
            response['MODELS'] = True
        return Response(response)


class ProjectFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    owner = filters.CharFilter(field_name="owner__username", lookup_expr="icontains")
    status = filters.CharFilter(field_name="status", lookup_expr="icontains")
    assignee = filters.CharFilter(field_name="assignee__username", lookup_expr="icontains")

    class Meta:
        model = models.Project
        fields = ("id", "name", "owner", "status", "assignee")

@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Returns a paginated list of projects according to query parameters (10 projects per page)',
    manual_parameters=[
        openapi.Parameter('id', openapi.IN_QUERY, description="A unique number value identifying this project",
            type=openapi.TYPE_NUMBER),
        openapi.Parameter('name', openapi.IN_QUERY, description="Find all projects where name contains a parameter value",
            type=openapi.TYPE_STRING),
        openapi.Parameter('owner', openapi.IN_QUERY, description="Find all project where owner name contains a parameter value",
            type=openapi.TYPE_STRING),
        openapi.Parameter('status', openapi.IN_QUERY, description="Find all projects with a specific status",
            type=openapi.TYPE_STRING, enum=[str(i) for i in StatusChoice]),
        openapi.Parameter('assignee', openapi.IN_QUERY, description="Find all projects where assignee name contains a parameter value",
            type=openapi.TYPE_STRING)]))
@method_decorator(name='create', decorator=swagger_auto_schema(operation_summary='Method creates a new project'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a specific project'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(operation_summary='Method deletes a specific project'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(operation_summary='Methods does a partial update of chosen fields in a project'))
class ProjectViewSet(auth.ProjectGetQuerySetMixin, viewsets.ModelViewSet):
    queryset = models.Project.objects.all().order_by('-id')
    serializer_class = ProjectSerializer
    search_fields = ("name", "owner__username", "assignee__username", "status")
    filterset_class = ProjectFilter
    ordering_fields = ("id", "name", "owner", "status", "assignee")
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.ProjectAccessPermission)
        elif http_method in ["POST"]:
            permissions.append(auth.ProjectCreatePermission)
        elif http_method in ["PATCH"]:
            permissions.append(auth.ProjectChangePermission)
        elif http_method in ["DELETE"]:
            permissions.append(auth.ProjectDeletePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    def perform_create(self, serializer):
        if self.request.data.get('owner', None):
            serializer.save()
        else:
            serializer.save(owner=self.request.user)

    @swagger_auto_schema(method='get', operation_summary='Returns information of the tasks of the project with the selected id',
        responses={'200': TaskSerializer(many=True)})
    @action(detail=True, methods=['GET'], serializer_class=TaskSerializer)
    def tasks(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Task.objects.filter(project_id=pk).order_by('-id')
        queryset = auth.filter_task_queryset(queryset, request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True,
                context={"request": request})
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True,
            context={"request": request})
        return Response(serializer.data)

class TaskFilter(filters.FilterSet):
    project = filters.CharFilter(field_name="project__name", lookup_expr="icontains")
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    owner = filters.CharFilter(field_name="owner__username", lookup_expr="icontains")
    mode = filters.CharFilter(field_name="mode", lookup_expr="icontains")
    status = filters.CharFilter(field_name="status", lookup_expr="icontains")
    assignee = filters.CharFilter(field_name="assignee__username", lookup_expr="icontains")

    class Meta:
        model = Task
        fields = ("id", "project_id", "project", "name", "owner", "mode", "status",
            "assignee")

class DjangoFilterInspector(CoreAPICompatInspector):
    def get_filter_parameters(self, filter_backend):
        if isinstance(filter_backend, DjangoFilterBackend):
            result = super(DjangoFilterInspector, self).get_filter_parameters(filter_backend)
            res = result.copy()

            for param in result:
                if param.get('name') == 'project_id' or param.get('name') == 'project':
                    res.remove(param)
            return res

        return NotHandled

@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Returns a paginated list of tasks according to query parameters (10 tasks per page)',
    manual_parameters=[
            openapi.Parameter('id',openapi.IN_QUERY,description="A unique number value identifying this task",type=openapi.TYPE_NUMBER),
            openapi.Parameter('name', openapi.IN_QUERY, description="Find all tasks where name contains a parameter value", type=openapi.TYPE_STRING),
            openapi.Parameter('owner', openapi.IN_QUERY, description="Find all tasks where owner name contains a parameter value", type=openapi.TYPE_STRING),
            openapi.Parameter('mode', openapi.IN_QUERY, description="Find all tasks with a specific mode", type=openapi.TYPE_STRING, enum=['annotation', 'interpolation']),
            openapi.Parameter('status', openapi.IN_QUERY, description="Find all tasks with a specific status", type=openapi.TYPE_STRING,enum=['annotation','validation','completed']),
            openapi.Parameter('assignee', openapi.IN_QUERY, description="Find all tasks where assignee name contains a parameter value", type=openapi.TYPE_STRING)
        ],
    filter_inspectors=[DjangoFilterInspector]))
@method_decorator(name='create', decorator=swagger_auto_schema(operation_summary='Method creates a new task in a database without any attached images and videos'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a specific task'))
@method_decorator(name='update', decorator=swagger_auto_schema(operation_summary='Method updates a task by id'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(operation_summary='Method deletes a specific task, all attached jobs, annotations, and data'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(operation_summary='Methods does a partial update of chosen fields in a task'))
class TaskViewSet(auth.TaskGetQuerySetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all().prefetch_related(
            "label_set__attributespec_set",
            "segment_set__job_set",
        ).order_by('-id')
    serializer_class = TaskSerializer
    search_fields = ("name", "owner__username", "mode", "status")
    filterset_class = TaskFilter
    ordering_fields = ("id", "name", "owner", "status", "assignee")

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.TaskAccessPermission)
        elif http_method in ["POST"]:
            permissions.append(auth.TaskCreatePermission)
        elif self.action == 'annotations' or http_method in ["PATCH", "PUT"]:
            permissions.append(auth.TaskChangePermission)
        elif http_method in ["DELETE"]:
            permissions.append(auth.TaskDeletePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    def perform_create(self, serializer):
        def validate_task_limit(owner):
            admin_perm = auth.AdminRolePermission()
            is_admin = admin_perm.has_permission(self.request, self)
            if not is_admin and settings.RESTRICTIONS['task_limit'] is not None and \
                Task.objects.filter(owner=owner).count() >= settings.RESTRICTIONS['task_limit']:
                raise serializers.ValidationError('The user has the maximum number of tasks')

        owner = self.request.data.get('owner', None)
        if owner:
            validate_task_limit(owner)
            serializer.save()
        else:
            validate_task_limit(self.request.user)
            serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        task_dirname = instance.get_task_dirname()
        super().perform_destroy(instance)
        shutil.rmtree(task_dirname, ignore_errors=True)
        if instance.data and not instance.data.tasks.all():
            shutil.rmtree(instance.data.get_data_dirname(), ignore_errors=True)
            instance.data.delete()

    # ISL AUTOSNAP
    @swagger_auto_schema(method='get', operation_summary='Returns automatically snapped or fitted coordinates of a box',
        manual_parameters=[
            openapi.Parameter('frameNumber', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the frame number in which the box is located"),
            openapi.Parameter('x1', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the top left x-coordinate"),
            openapi.Parameter('y1', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the top left y-coordinate"),
            openapi.Parameter('x2', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the bottom right x-coordinate"),
            openapi.Parameter('y2', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the bottom right y-coordinate"),
            ]
    )
    @action(detail=True, methods=['GET'])
    def autofit(self, request, pk):
        frame = request.query_params.get('frameNumber', None)
        xtl = float(request.query_params.get('x1', None))
        ytl = float(request.query_params.get('y1', None))
        xbr = float(request.query_params.get('x2', None))
        ybr = float(request.query_params.get('y2', None))
        data = [0,0,100,100]
        config.read(config_path)
        if(not config.getboolean('main','autofit')):
            # autofit is disable
            print('AUTOFIT IS DISABLED')
            new_coords = {
                    "points" : [xtl, ytl, xbr, ybr],
                }
            return Response(new_coords)
        # expand the dimensions by 20% to get snaps for vehicles bigger than the initial box
        width = xbr-xtl
        height = ybr-ytl
        xtl -= (width/2)*0.1
        ytl -= (height/2)*0.1
        xbr += (width/2)*0.1
        ybr += (height/2)*0.1
        xtl = int(xtl)
        ytl = int(ytl)
        xbr = int(xbr)
        ybr = int(ybr)

        # ADD code for getting the image here
        db_task = self.get_object()
        frame_provider = FrameProvider(db_task.data)
        data_quality = FrameProvider.Quality.COMPRESSED
        img, mime = frame_provider.get_frame(int(frame), data_quality)
        img = Image.open(img)
        orig_img = np.array(img)
        try:
            data = efficientcut(orig_img, [xtl, ytl, xbr, ybr])
            # data = [100,100,200,200]

            if(xtl is not None and ytl is not None and xbr is not None and ybr is not None and data is not None):
                new_coords = {
                    "points" : data,
                }
            return Response(new_coords)
        except Exception as e:
            msg = "Error occured while snapping."
            return Response(data='%s %s' %(msg , str(e)), status=status.HTTP_400_BAD_REQUEST)

    # ISL END

    # EDITED FOR TRACKING
    @swagger_auto_schema(method='get', operation_summary='Returns tracker coordinates',
        manual_parameters=[
            openapi.Parameter('object-id', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the objectID of the box"),
            openapi.Parameter('frame-start', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the frame number in which the tracking will begin"),
            openapi.Parameter('frame-end', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the frame number in which the tracking will end"),
            openapi.Parameter('x1', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the top left x-coordinate"),
            openapi.Parameter('y1', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the top left y-coordinate"),
            openapi.Parameter('x2', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the bottom right x-coordinate"),
            openapi.Parameter('y2', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the bottom right y-coordinate"),
            ]
    )
    @action(detail=True, methods=['GET'])
    def tracking(self, request, pk):
        config.read(config_path)
        try:
            useCroppedBG = False
            startTime = current_milli_time()
            frameList = []
            objectID = request.query_params.get('object-id', None)
            frameStart = int(request.query_params.get('frame-start', None))
            frameEnd = int(request.query_params.get('frame-end', None))
            xtl = int(request.query_params.get('x1', None))
            ytl = int(request.query_params.get('y1', None))
            xbr = int(request.query_params.get('x2', None))
            ybr = int(request.query_params.get('y2', None))

            if(useCroppedBG):
                # ADD code for getting the image here
                w = xbr - xtl
                h = ybr - ytl
                # compute the cropped image relative to original frame
                # imagine a 5x5 grid in which the bbox is in the center
                cropped_xtl = max(0,xtl-(2*w))
                cropped_ytl = max(0,ytl-(2*h))
                cropped_xbr = min(1919, xbr+(2*w))
                cropped_ybr = min(1079,ybr+(2*h))
                # compute new coordinates of the bbox to be tracked
                new_xtl = (xtl if cropped_xtl==0 else 2*w)
                new_ytl = (ytl if cropped_ytl==0 else 2*h)
                new_xbr = new_xtl + w
                new_ybr = new_ytl + h
            start_frame_fetch = current_milli_time()
            db_task = self.get_object()
            frame_provider = FrameProvider(db_task.data)
            data_quality = FrameProvider.Quality.COMPRESSED

            skip = 2
            out_type = FrameProvider.Type.NUMPY_ARRAY
            if(useCroppedBG):
                for x in range(frameStart, frameEnd+1):
                    if((x-frameStart) % 2 == 1):
                        continue
                    img, mime = frame_provider.get_frame(x, data_quality)
                    img = Image.open(img)
                    orig_img = np.array(img)
                    image = orig_img[:, :, ::-1].copy()
                    if(useCroppedBG):
                        image = image[cropped_ytl:cropped_ybr,cropped_xtl:cropped_xbr,:]
                    frameList.append(image)
            else:
                frameList = frame_provider.get_frames_improved(frameStart,frameEnd,data_quality,out_type,skip)

            print('frameList length: %d' % len(frameList))
            if(useCroppedBG):
                data = (new_xtl, new_ytl, new_xbr-new_xtl, new_ybr-new_ytl)
            else:
                data = (xtl, ytl, xbr-xtl, ybr-ytl)
            print('Frame fetching time: %d' % (current_milli_time() - start_frame_fetch))
            start_csrt = current_milli_time()
            print(data)
            tracker = Tracker()
            results = tracker.track(frameList, data,config['main']['tracker'])
            print('results length',len(results))
            # enable/disable grabcut on the results
            # for result,frame in zip(results,frameList):
            #     data, dim = grabcut.run(frame,result[0],result[1],result[2],result[3])
            #     result = data
            if(useCroppedBG):
                for result in results:
                    result[0] = result[0] + cropped_xtl
                    result[1] = result[1] + cropped_ytl
                    result[2] = result[2] + cropped_xtl
                    result[3] = result[3] + cropped_ytl

            print('Tracking algo time: %d' % (current_milli_time() - start_csrt))
            print('results', results)

            if(xtl is not None and ytl is not None and xbr is not None and ybr is not None and data is not None):
                new_coords = {
                    "object" : objectID,
                    "frameStart" : frameStart,
                    "frameEnd" : frameEnd,
                    "old_points" : [xtl, ytl, xbr, ybr],
                    "path" : request.build_absolute_uri(),
                    "tracker_coords" : results,
                }
            print('Total execution time: %d' % (current_milli_time()-startTime))
            return Response(new_coords)
        except Exception as e:
            msg = "something is wrong"
            return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)
    # EDITED END

    # EDITED FOR TRACKING
    @swagger_auto_schema(method='post', operation_summary='Returns tracker coordinates for all the bounding boxes',
    )
    @swagger_auto_schema(method='get', operation_summary='Method returns preview for the trackall feature',
        manual_parameters=[
            openapi.Parameter('type', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
                enum=['chunk', 'frame', 'preview'],
                description="Specifies the type of the requested data"),
            openapi.Parameter('quality', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
                enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            openapi.Parameter('number', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="A unique number value identifying chunk or frame, doesn't matter for 'preview' type"),
            openapi.Parameter('frame-start', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the frame number in which the tracking will begin"),
            openapi.Parameter('object-id', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies ID of the focused object in tracking"),
            ]
    )
    @action(detail=True, methods=['POST','GET'])
    def trackall(self, request, pk):
        if request.method == 'POST':
        # try:
            print('request.data',request.data)
            # get the parameters of the request
            data = request.data['params']
            mode = data['mode'] #'NORMAL' or 'APPEND' or 'EDIT'
            framesToTrack = int(data['framesToTrack'])
            frameStart = int(data['frameStart'])
            print('framesToTrack',framesToTrack)
            objectIDs = data['objectID']
            frameEnd = frameStart+framesToTrack
            results = []

            #frame getter
            db_task = self.get_object()
            frame_provider = FrameProvider(db_task.data)
            data_quality = FrameProvider.Quality.COMPRESSED
            skip = 2
            out_type = FrameProvider.Type.NUMPY_ARRAY

            #initiate tracker
            tracker = Tracker()

            #track based on the mode
            print('tracking in mode',mode)
            if(mode=='NORMAL'):
                storage.flush()
                bboxes = data['bboxes']
                # get the frames

                frameList = frame_provider.get_frames_improved(frameStart,frameEnd,data_quality,out_type,skip)

                for bbox in bboxes:
                    index = bboxes.index(bbox)
                    print('tracking item ',index)
                    bbox[0]=int(bbox[0])
                    bbox[1]=int(bbox[1])
                    bbox[2]=int(bbox[2])
                    bbox[3]=int(bbox[3])
                    xtl = bbox[0]
                    ytl = bbox[1]
                    xbr = bbox[2]
                    ybr = bbox[3]
                    data = (xtl, ytl, xbr-xtl, ybr-ytl)
                    result = tracker.track(frameList, data,'pysot')
                    int_result = []
                    for idx, bbox in enumerate(result):
                        temp_bbox = [int(bbox[0]),int(bbox[1]),int(bbox[2]),int(bbox[3])]
                        # fittedbbox = efficientcut(frameList[idx+1], [bbox[0], bbox[1], bbox[2], bbox[3]])
                        fittedbbox = temp_bbox
                        temp_bbox = [0,0,0,0]
                        temp_bbox[0]=int(fittedbbox[0])
                        temp_bbox[1]=int(fittedbbox[1])
                        temp_bbox[2]=int(fittedbbox[2])
                        temp_bbox[3]=int(fittedbbox[3])
                        int_result.append(temp_bbox)
                        # print(type(result[idx][0]))
                        # print(int_result[idx])
                    # print('result length',len(result))
                    # print('frameList length', len(frameList))
                    # print(result)
                    results.append(int_result)
                    crops = []
                    result = int_result
                    for i in range(0,len(frameList)):
                        if(i==0):
                            crop = frameList[i][bbox[1]:bbox[3],bbox[0]:bbox[2]]
                            crops.append(crop)
                        else:
                            temp_result = int_result[i-1]
                            for coord in temp_result:
                                coord = int(coord)
                            crop = frameList[i][temp_result[1]:temp_result[3],temp_result[0]:temp_result[2]]
                            crops.append(crop)
                        # frameList[-1][ytl:yrb,xtl:xbr]

                    # print('crops length', len(crops))
                    store_data = []
                    store_id = objectIDs[index]
                    for i in range(len(crops)):
                        item = {
                            'bbox':bbox if i==0 else result[i-1],
                            'frame': frameStart+i*2,
                            'crop':crops[i],
                            "objectID":store_id
                        }
                        store_data.append(item)
                    print('store_id',store_id)
                    store_entry={
                        "data":store_data,
                        "objectID":store_id,
                        "frameStart":frameStart,
                        "frameEnd":frameEnd
                    }
                    storage.store(store_entry)
            elif(mode =='APPEND'):
                bboxes = []
                new_frame_start = storage.get(objectIDs[0])[-1]['frame']
                print(new_frame_start)
                for objectID in objectIDs:
                    items = storage.get(objectID)
                    bbox = items[-1]['bbox']
                    bboxes.append(bbox)
                    print(bbox)
                frameList = frame_provider.get_frames_improved(new_frame_start,frameEnd,data_quality,out_type,skip)

                for bbox in bboxes:
                    index = bboxes.index(bbox)
                    print('tracking item ',index)
                    bbox[0]=int(bbox[0])
                    bbox[1]=int(bbox[1])
                    bbox[2]=int(bbox[2])
                    bbox[3]=int(bbox[3])
                    xtl = bbox[0]
                    ytl = bbox[1]
                    xbr = bbox[2]
                    ybr = bbox[3]
                    data = (xtl, ytl, xbr-xtl, ybr-ytl)
                    result = tracker.track(frameList, data,'pysot')
                    print('result length',len(result))
                    print('frameList length', len(frameList))
                    # print(result)
                    results.append(result)
                    crops = []

                    for i in range(0,len(frameList)):
                        if(i==0):
                            continue
                        else:
                            temp_result = result[i-1] #a bbox
                            for coord in temp_result:
                                coord = int(coord)
                            crop = frameList[i][temp_result[1]:temp_result[3],temp_result[0]:temp_result[2]]
                            crops.append(crop)
                        # frameList[-1][ytl:yrb,xtl:xbr]

                    print('crops length', len(crops))
                    store_data = []
                    store_id = objectIDs[index]
                    for i in range(len(crops)):
                        item = {
                            'bbox':result[i],
                            'frame': new_frame_start+(1+i)*2,
                            'crop':crops[i],
                            "objectID":store_id
                        }
                        store_data.append(item)
                    print('store_id',store_id)
                    store_entry={
                        "data":store_data,
                        "objectID":store_id,
                        "frameStart":frameStart,
                        "frameEnd":frameEnd
                    }
                    storage.update(store_entry)
            elif(mode=='EDIT'):
                print('EDIT MODE DETECTED')
                selectedObjectID = data['selectedObjectID']
                slice_index = int(data['slice']) +1 # +1 to account for the initial bounding box stored in the server but not in the UI
                bbox_slice = data['bbox_slice']

                bbox_slice[0]=int(bbox_slice[0])
                bbox_slice[1]=int(bbox_slice[1])
                bbox_slice[2]=int(bbox_slice[2])
                bbox_slice[3]=int(bbox_slice[3])
                print(bbox_slice)
                img, mime = frame_provider.get_frame(slice_index*2+2, data_quality)
                img = Image.open(img)
                orig_img = np.array(img)
                crop = orig_img[bbox_slice[1]:bbox_slice[3],bbox_slice[0]:bbox_slice[2]]
                storage.edit(selectedObjectID,slice_index,bbox_slice,crop)
                return Response([0,0,0,0])
            return Response(results)
        else:
            # GET request
            data_type = request.query_params.get('type', None)
            data_id = request.query_params.get('number', None)
            data_quality = request.query_params.get('quality', 'compressed')
            frame_start = request.query_params.get('frame-start', None)
            object_id = request.query_params.get('object-id', None)
            slice_index = request.query_params.get('slice', None)
            #convert to index of items
            slice_index = floor(int(slice_index)/2)
            print(slice_index)
            if(object_id):
                object_id = int(object_id)
            possible_data_type_values = ('chunk', 'frame', 'preview')
            possible_quality_values = ('compressed', 'original')

            if not data_type or data_type not in possible_data_type_values:
                return Response(data='data type not specified or has wrong value', status=status.HTTP_400_BAD_REQUEST)
            elif data_type == 'chunk' or data_type == 'frame':
                if not data_id:
                    return Response(data='number not specified', status=status.HTTP_400_BAD_REQUEST)
                elif data_quality not in possible_quality_values:
                    return Response(data='wrong quality value', status=status.HTTP_400_BAD_REQUEST)

            try:
                db_task = self.get_object()
                frame_provider = FrameProvider(db_task.data)

                data_id = int(data_id)
                data_quality = FrameProvider.Quality.COMPRESSED
                buf, mime = frame_provider.get_frame(data_id, data_quality)


                # bytes_image=buf.getvalue()

                if(storage.check()):
                    img = Image.open(buf)
                    img = np.array(img)
                    items = storage.get(object_id)
                    print('object id',object_id)
                    skip = 3
                    i=0
                    if(items):
                        if(len(items)>0):
                            # print(items)
                            print('items not empty. size:',len(items))

                            item = items[slice_index] # save the crop of the desired slice index
                            # print(item)
                            retrieved_id = item['objectID']
                            print('id from store',retrieved_id)
                            orig_box = item['bbox']
                            orig_crop = np.copy(img[orig_box[1]:orig_box[3],orig_box[0]:orig_box[2]])

                            for item in items:
                                i+=1
                                if(i%skip!=0):
                                    continue

                                # print('aalsdjad')
                                # print(item[0][0])
                                crop = item['crop']
                                box = item['bbox']
                                # print('crop',np.shape(crop))
                                # print('bbox',box)
                                img[box[1]:box[3],box[0]:box[2]]=crop
                                cv2.rectangle(img, (box[0],box[1]), (box[2],box[3]), (0,0,255), 1)
                                centroid = (int((box[0]+box[2])/2),int((box[1]+box[3])/2))
                                cv2.circle(img,centroid,4,(0,0,255),10)
                            # write the final frame on top
                            img[orig_box[1]:orig_box[3],orig_box[0]:orig_box[2]]=orig_crop
                            cv2.rectangle(img, (orig_box[0],orig_box[1]), (orig_box[2],orig_box[3]), (255,0,0), 1)
                    new_im = Image.fromarray(img,mode='RGB')
                    b = io.BytesIO()
                    new_im.save(b,format="jpeg")
                    return HttpResponse(b.getvalue(), content_type=mime)
                else:
                    return HttpResponse(buf.getvalue(), content_type=mime)
            except APIException as e:
                return Response(data=e.default_detail, status=e.status_code)
            except Exception as e:
                msg = 'cannot get requested data type: {}, number: {}, quality: {}'.format(data_type, data_id, data_quality)
                slogger.task[pk].error(msg, exc_info=True)
                return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)

    # EDITED END
    # ISL GLOBAL ATTRIBUTES
    @swagger_auto_schema(method='get', operation_summary='Get saved attributes for a task')
    @action(detail=True, methods=['GET'])
    def getattributes(self, request, pk):
        try:
            task = Task.objects.get(pk=pk)
            attribute = models.Attributes.objects.get(task=task)
            attributesDB = attribute.value
            return Response(attributesDB)
        except models.Attributes.DoesNotExist:
            print('No saved global attributes found')
            msg = "Requested attributes for task %s does not exist" % pk
            return Response(data="%s" %(msg), status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            msg = "something is wrong"
            return Response(data="%s \n %s" %(msg, str(e)), status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(method='post', operation_summary='Set saved attributes for a task')
    @action(detail=True, methods=['POST'])
    def saveattributes(self, request, pk):
        print(request.data)
        try:
            task = Task.objects.get(pk=pk)
            attribute,created = models.Attributes.objects.get_or_create(task=task)
            attribute.value = json.dumps(request.data)
            attribute.save()
            print('MARKER ATTRIBUTE')
            print(attribute.value)
            return Response(data=attribute.value,status=200)
        except Exception as e:
            msg = "something is wrong"
            return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(method='get', operation_summary='Delete saved attributes for a task')
    @action(detail=True, methods=['GET'])
    def deletettributes(self, request, pk):
        print(request.data)
        try:
            task = Task.objects.get(pk=pk)
            attribute = models.Attributes.objects.filter(task=task).delete()
            return Response(data="Delete OK",status=200)
        except Exception as e:
            msg = "something is wrong"
            return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)

    # ISL END
    # ISL TOGGLE FEATURES
    @swagger_auto_schema(method='get', operation_summary='Method returns ISL Features Configuration'
    )
    @swagger_auto_schema(method='post', operation_summary='Method allows to edit ISL Features Configuration'
    )
    @action(detail=True, methods=['GET', 'post'],
        serializer_class=ISLConfigSerializer)
    def ISLconfig(self, request, pk):
        config = ConfigParser()
        config.read(config_path)
        if request.method == 'POST':
            print('request.data',request.data)
            data = request.data['params']
            try:
                # try:
                #     if(data['autofit'] is not None):
                #         print('received autofit',data['autofit'])
                #         print(type(data['autofit']))
                #         print(type(str(data['autofit'])))
                #         config['main']['autofit'] = str(data['autofit'])
                # except:
                #     print('no data for autofit')
                # try:
                #     if(data['globalattributes'] is not None):
                #         print('received globalattributes',data['globalattributes'])
                #         config['main']['globalattributes'] = str(data['globalattributes'])
                # except:
                #     print('no data for global attributes')
                for attr,value in data.items():
                    config['main'][attr] = str(value)
                with open(config_path, 'w') as configfile:
                    config.write(configfile)
                # config.write(config_path)
                print('config update successful')
                data = {}
                for attr,value in config['main'].items():
                    print(attr,value)
                    data[attr]=value
                serializer = ISLConfigSerializer(data=data)
                serializer.is_valid()
                return Response(serializer.data)
            except Exception as e:
                msg = "Invalid values"
                return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)
        else:
            data = {}
            for attr,value in config['main'].items():
                print('(',type(value),')',attr,value)
                data[attr]=value
            print('data',data)
            serializer = ISLConfigSerializer(data=data)
            print(serializer.is_valid())
            print('serialized',serializer.data)
            return Response(serializer.data)
    # ISL END
    # MABE PREDICT BOUNDING BOXES
    @swagger_auto_schema(method='get', operation_summary='Returns coordinates of potential bounding boxes',
        manual_parameters=[
            openapi.Parameter('frameNumber', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="Specifies the frame number in which the box is located"),
            ]
    )
    @action(detail=True, methods=['GET'])
    def predictBBs(self, request, pk):
        frame = request.query_params.get('frameNumber', None)
        data = [0,0,100,100]

        config = ConfigParser()
        config.read(config_path)
        # ADD code for getting the image here
        db_task = self.get_object()
        frame_provider = FrameProvider(db_task.data)
        data_quality = FrameProvider.Quality.ORIGINAL
        img, mime = frame_provider.get_frame(int(frame), data_quality)
        img = Image.open(img)
        orig_img = np.array(img)
        try:
            print()
            data = predict(orig_img,config['main']['predict_bb_models'])
            # data = [100,100,200,200]
            new_coords = {
                "bboxes" : data['bbox'],
            }
            return Response(new_coords)
        except Exception as e:
            msg = "Error occured while predicting."
            return Response(data='%s %s' %(msg , str(e)), status=status.HTTP_400_BAD_REQUEST)

    # ISL END

    @swagger_auto_schema(method='get', operation_summary='Returns a list of jobs for a specific task',
        responses={'200': JobSerializer(many=True)})
    @action(detail=True, methods=['GET'], serializer_class=JobSerializer)
    def jobs(self, request, pk):
        self.get_object() # force to call check_object_permissions
        queryset = Job.objects.filter(segment__task_id=pk)
        serializer = JobSerializer(queryset, many=True,
            context={"request": request})

        return Response(serializer.data)

    @swagger_auto_schema(method='post', operation_summary='Method permanently attaches images or video to a task',
        request_body=DataSerializer,
    )
    @swagger_auto_schema(method='get', operation_summary='Method returns data for a specific task',
        manual_parameters=[
            openapi.Parameter('type', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
                enum=['chunk', 'frame', 'preview'],
                description="Specifies the type of the requested data"),
            openapi.Parameter('quality', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
                enum=['compressed', 'original'],
                description="Specifies the quality level of the requested data, doesn't matter for 'preview' type"),
            openapi.Parameter('number', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_NUMBER,
                description="A unique number value identifying chunk or frame, doesn't matter for 'preview' type"),
            ]
    )
    @action(detail=True, methods=['POST', 'GET'])
    def data(self, request, pk):
        if request.method == 'POST':
            db_task = self.get_object() # call check_object_permissions as well
            serializer = DataSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            db_data = serializer.save()
            db_task.data = db_data
            db_task.save()
            data = {k:v for k, v in serializer.data.items()}
            data['use_zip_chunks'] = serializer.validated_data['use_zip_chunks']
            data['use_cache'] = serializer.validated_data['use_cache']
            if data['use_cache']:
                db_task.data.storage_method = StorageMethodChoice.CACHE
                db_task.data.save(update_fields=['storage_method'])

            # if the value of stop_frame is 0, then inside the function we cannot know
            # the value specified by the user or it's default value from the database
            if 'stop_frame' not in serializer.validated_data:
                data['stop_frame'] = None
            task.create(db_task.id, data)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)
        else:
            data_type = request.query_params.get('type', None)
            data_id = request.query_params.get('number', None)
            data_quality = request.query_params.get('quality', 'compressed')

            possible_data_type_values = ('chunk', 'frame', 'preview')
            possible_quality_values = ('compressed', 'original')

            if not data_type or data_type not in possible_data_type_values:
                return Response(data='data type not specified or has wrong value', status=status.HTTP_400_BAD_REQUEST)
            elif data_type == 'chunk' or data_type == 'frame':
                if not data_id:
                    return Response(data='number not specified', status=status.HTTP_400_BAD_REQUEST)
                elif data_quality not in possible_quality_values:
                    return Response(data='wrong quality value', status=status.HTTP_400_BAD_REQUEST)

            try:
                db_task = self.get_object()
                db_data = db_task.data
                frame_provider = FrameProvider(db_task.data)

                if data_type == 'chunk':
                    data_id = int(data_id)

                    data_quality = FrameProvider.Quality.COMPRESSED \
                        if data_quality == 'compressed' else FrameProvider.Quality.ORIGINAL

                    #TODO: av.FFmpegError processing
                    if settings.USE_CACHE and db_data.storage_method == StorageMethodChoice.CACHE:
                        buff, mime_type = frame_provider.get_chunk(data_id, data_quality)
                        return HttpResponse(buff.getvalue(), content_type=mime_type)

                    # Follow symbol links if the chunk is a link on a real image otherwise
                    # mimetype detection inside sendfile will work incorrectly.
                    path = os.path.realpath(frame_provider.get_chunk(data_id, data_quality))
                    return sendfile(request, path)

                elif data_type == 'frame':
                    data_id = int(data_id)
                    data_quality = FrameProvider.Quality.COMPRESSED \
                        if data_quality == 'compressed' else FrameProvider.Quality.ORIGINAL
                    buf, mime = frame_provider.get_frame(data_id, data_quality)
                    print(mime)
                    return HttpResponse(buf.getvalue(), content_type=mime)

                elif data_type == 'preview':
                    return sendfile(request, frame_provider.get_preview())
                else:
                    return Response(data='unknown data type {}.'.format(data_type), status=status.HTTP_400_BAD_REQUEST)
            except APIException as e:
                return Response(data=e.default_detail, status=e.status_code)
            except Exception as e:
                msg = 'cannot get requested data type: {}, number: {}, quality: {}'.format(data_type, data_id, data_quality)
                slogger.task[pk].error(msg, exc_info=True)
                return Response(data=msg + '\n' + str(e), status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(method='get', operation_summary='Method allows to download task annotations',
        manual_parameters=[
            openapi.Parameter('format', openapi.IN_QUERY,
                description="Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats",
                type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('filename', openapi.IN_QUERY,
                description="Desired output file name",
                type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('action', in_=openapi.IN_QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=openapi.TYPE_STRING, required=False, enum=['download'])
        ],
        responses={
            '202': openapi.Response(description='Dump of annotations has been started'),
            '201': openapi.Response(description='Annotations file is ready to download'),
            '200': openapi.Response(description='Download of file started'),
            '405': openapi.Response(description='Format is not available'),
        }
    )
    @swagger_auto_schema(method='put', operation_summary='Method allows to upload task annotations',
        manual_parameters=[
            openapi.Parameter('format', openapi.IN_QUERY,
                description="Input format name\nYou can get the list of supported formats at:\n/server/annotation/formats",
                type=openapi.TYPE_STRING, required=False),
        ],
        responses={
            '202': openapi.Response(description='Uploading has been started'),
            '201': openapi.Response(description='Uploading has finished'),
            '405': openapi.Response(description='Format is not available'),
        }
    )
    @swagger_auto_schema(method='patch', operation_summary='Method performs a partial update of annotations in a specific task',
        manual_parameters=[openapi.Parameter('action', in_=openapi.IN_QUERY, required=True, type=openapi.TYPE_STRING,
            enum=['create', 'update', 'delete'])])
    @swagger_auto_schema(method='delete', operation_summary='Method deletes all annotations for a specific task')
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        db_task = self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            format_name = request.query_params.get('format')
            if format_name:
                return _export_annotations(db_task=db_task,
                    rq_id="/api/v1/tasks/{}/annotations/{}".format(pk, format_name),
                    request=request,
                    action=request.query_params.get("action", "").lower(),
                    callback=dm.views.export_task_annotations,
                    format_name=format_name,
                    filename=request.query_params.get("filename", "").lower(),
                )
            else:
                data = dm.task.get_task_data(pk)
                serializer = LabeledDataSerializer(data=data)
                if serializer.is_valid(raise_exception=True):
                    return Response(serializer.data)
        elif request.method == 'PUT':
            format_name = request.query_params.get('format')
            if format_name:
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/v1/tasks/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_task_annotations,
                    pk=pk,
                    format_name=format_name,
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    data = dm.task.put_task_data(pk, serializer.data)
                    return Response(data)
        elif request.method == 'DELETE':
            dm.task.delete_task_data(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in dm.task.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = dm.task.patch_task_data(pk, serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)

    @swagger_auto_schema(method='get', operation_summary='When task is being created the method returns information about a status of the creation process')
    @action(detail=True, methods=['GET'], serializer_class=RqStatusSerializer)
    def status(self, request, pk):
        self.get_object() # force to call check_object_permissions
        response = self._get_rq_response(queue="default",
            job_id="/api/{}/tasks/{}".format(request.version, pk))
        serializer = RqStatusSerializer(data=response)

        if serializer.is_valid(raise_exception=True):
            return Response(serializer.data)

    @staticmethod
    def _get_rq_response(queue, job_id):
        queue = django_rq.get_queue(queue)
        job = queue.fetch_job(job_id)
        response = {}
        if job is None or job.is_finished:
            response = { "state": "Finished" }
        elif job.is_queued:
            response = { "state": "Queued" }
        elif job.is_failed:
            response = { "state": "Failed", "message": job.exc_info }
        else:
            response = { "state": "Started" }
            if 'status' in job.meta:
                response['message'] = job.meta['status']

        return response

    @staticmethod
    @swagger_auto_schema(method='get', operation_summary='Method provides a meta information about media files which are related with the task',
        responses={'200': DataMetaSerializer()})
    @action(detail=True, methods=['GET'], serializer_class=DataMetaSerializer,
        url_path='data/meta')
    def data_info(request, pk):
        db_task = models.Task.objects.prefetch_related('data__images').select_related('data__video').get(pk=pk)

        if hasattr(db_task.data, 'video'):
            media = [db_task.data.video]
        else:
            media = list(db_task.data.images.order_by('frame'))

        frame_meta = [{
            'width': item.width,
            'height': item.height,
            'name': item.path,
        } for item in media]

        db_data = db_task.data
        db_data.frames = frame_meta

        serializer = DataMetaSerializer(db_data)
        return Response(serializer.data)

    @swagger_auto_schema(method='get', operation_summary='Export task as a dataset in a specific format',
        manual_parameters=[
            openapi.Parameter('format', openapi.IN_QUERY,
                description="Desired output format name\nYou can get the list of supported formats at:\n/server/annotation/formats",
                type=openapi.TYPE_STRING, required=True),
            openapi.Parameter('filename', openapi.IN_QUERY,
                description="Desired output file name",
                type=openapi.TYPE_STRING, required=False),
            openapi.Parameter('action', in_=openapi.IN_QUERY,
                description='Used to start downloading process after annotation file had been created',
                type=openapi.TYPE_STRING, required=False, enum=['download'])
        ],
        responses={'202': openapi.Response(description='Exporting has been started'),
            '201': openapi.Response(description='Output file is ready for downloading'),
            '200': openapi.Response(description='Download of file started'),
            '405': openapi.Response(description='Format is not available'),
        }
    )
    @action(detail=True, methods=['GET'], serializer_class=None,
        url_path='dataset')
    def dataset_export(self, request, pk):
        db_task = self.get_object() # force to call check_object_permissions

        format_name = request.query_params.get("format", "")
        return _export_annotations(db_task=db_task,
            rq_id="/api/v1/tasks/{}/dataset/{}".format(pk, format_name),
            request=request,
            action=request.query_params.get("action", "").lower(),
            callback=dm.views.export_task_as_dataset,
            format_name=format_name,
            filename=request.query_params.get("filename", "").lower(),
        )

@method_decorator(name='retrieve', decorator=swagger_auto_schema(operation_summary='Method returns details of a job'))
@method_decorator(name='update', decorator=swagger_auto_schema(operation_summary='Method updates a job by id'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Methods does a partial update of chosen fields in a job'))
class JobViewSet(viewsets.GenericViewSet,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    queryset = Job.objects.all().order_by('id')
    serializer_class = JobSerializer

    def get_permissions(self):
        http_method = self.request.method
        permissions = [IsAuthenticated]

        if http_method in SAFE_METHODS:
            permissions.append(auth.JobAccessPermission)
        elif http_method in ["PATCH", "PUT", "DELETE"]:
            permissions.append(auth.JobChangePermission)
        else:
            permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    @swagger_auto_schema(method='get', operation_summary='Method returns annotations for a specific job')
    @swagger_auto_schema(method='put', operation_summary='Method performs an update of all annotations in a specific job')
    @swagger_auto_schema(method='patch', manual_parameters=[
        openapi.Parameter('action', in_=openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
            enum=['create', 'update', 'delete'])],
            operation_summary='Method performs a partial update of annotations in a specific job')
    @swagger_auto_schema(method='delete', operation_summary='Method deletes all annotations for a specific job')
    @action(detail=True, methods=['GET', 'DELETE', 'PUT', 'PATCH'],
        serializer_class=LabeledDataSerializer)
    def annotations(self, request, pk):
        self.get_object() # force to call check_object_permissions
        if request.method == 'GET':
            data = dm.task.get_job_data(pk)
            return Response(data)
        elif request.method == 'PUT':
            format_name = request.query_params.get("format", "")
            if format_name:
                return _import_annotations(
                    request=request,
                    rq_id="{}@/api/v1/jobs/{}/annotations/upload".format(request.user, pk),
                    rq_func=dm.task.import_job_annotations,
                    pk=pk,
                    format_name=format_name
                )
            else:
                serializer = LabeledDataSerializer(data=request.data)
                if serializer.is_valid(raise_exception=True):
                    try:
                        data = dm.task.put_job_data(pk, serializer.data)
                    except (AttributeError, IntegrityError) as e:
                        return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                    return Response(data)
        elif request.method == 'DELETE':
            dm.task.delete_job_data(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        elif request.method == 'PATCH':
            action = self.request.query_params.get("action", None)
            if action not in dm.task.PatchAction.values():
                raise serializers.ValidationError(
                    "Please specify a correct 'action' for the request")
            serializer = LabeledDataSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                try:
                    data = dm.task.patch_job_data(pk, serializer.data, action)
                except (AttributeError, IntegrityError) as e:
                    return Response(data=str(e), status=status.HTTP_400_BAD_REQUEST)
                return Response(data)

class UserFilter(filters.FilterSet):
    class Meta:
        model = User
        fields = ("id",)


@method_decorator(name='list', decorator=swagger_auto_schema(
    manual_parameters=[
            openapi.Parameter('id',openapi.IN_QUERY,description="A unique number value identifying this user",type=openapi.TYPE_NUMBER),
    ],
    operation_summary='Method provides a paginated list of users registered on the server'))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Method provides information of a specific user'))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Method updates chosen fields of a user'))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Method deletes a specific user from the server'))
class UserViewSet(viewsets.GenericViewSet, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin):
    queryset = User.objects.prefetch_related('groups').all().order_by('id')
    http_method_names = ['get', 'post', 'head', 'patch', 'delete']
    search_fields = ('username', 'first_name', 'last_name')
    filterset_class = UserFilter

    def get_serializer_class(self):
        user = self.request.user
        if user.is_staff:
            return UserSerializer
        else:
            is_self = int(self.kwargs.get("pk", 0)) == user.id or \
                self.action == "self"
            if is_self and self.request.method in SAFE_METHODS:
                return UserSerializer
            else:
                return BasicUserSerializer

    def get_permissions(self):
        permissions = [IsAuthenticated]
        user = self.request.user

        if not self.request.method in SAFE_METHODS:
            is_self = int(self.kwargs.get("pk", 0)) == user.id
            if not is_self:
                permissions.append(auth.AdminRolePermission)

        return [perm() for perm in permissions]

    @swagger_auto_schema(method='get', operation_summary='Method returns an instance of a user who is currently authorized')
    @action(detail=False, methods=['GET'])
    def self(self, request):
        """
        Method returns an instance of a user who is currently authorized
        """
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(request.user, context={ "request": request })
        return Response(serializer.data)

def rq_handler(job, exc_type, exc_value, tb):
    job.exc_info = "".join(
        traceback.format_exception_only(exc_type, exc_value))
    job.save()
    if "tasks" in job.id.split("/"):
        return task.rq_handler(job, exc_type, exc_value, tb)

    return True

# TODO: Method should be reimplemented as a separated view
# @swagger_auto_schema(method='put', manual_parameters=[openapi.Parameter('format', in_=openapi.IN_QUERY,
#         description='A name of a loader\nYou can get annotation loaders from this API:\n/server/annotation/formats',
#         required=True, type=openapi.TYPE_STRING)],
#     operation_summary='Method allows to upload annotations',
#     responses={'202': openapi.Response(description='Load of annotations has been started'),
#         '201': openapi.Response(description='Annotations have been uploaded')},
#     tags=['tasks'])
# @api_view(['PUT'])
def _import_annotations(request, rq_id, rq_func, pk, format_name):
    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_import_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown input format '{}'".format(format_name))
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue("default")
    rq_job = queue.fetch_job(rq_id)

    if not rq_job:
        serializer = AnnotationFileSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            anno_file = serializer.validated_data['annotation_file']
            fd, filename = mkstemp(prefix='cvat_{}'.format(pk))
            with open(filename, 'wb+') as f:
                for chunk in anno_file.chunks():
                    f.write(chunk)

            av_scan_paths(filename)
            rq_job = queue.enqueue_call(
                func=rq_func,
                args=(pk, filename, format_name),
                job_id=rq_id
            )
            rq_job.meta['tmp_file'] = filename
            rq_job.meta['tmp_file_descriptor'] = fd
            rq_job.save_meta()
    else:
        if rq_job.is_finished:
            os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            rq_job.delete()
            return Response(status=status.HTTP_201_CREATED)
        elif rq_job.is_failed:
            os.close(rq_job.meta['tmp_file_descriptor'])
            os.remove(rq_job.meta['tmp_file'])
            exc_info = str(rq_job.exc_info)
            rq_job.delete()
            return Response(data=exc_info, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(status=status.HTTP_202_ACCEPTED)

def _export_annotations(db_task, rq_id, request, format_name, action, callback, filename):
    if action not in {"", "download"}:
        raise serializers.ValidationError(
            "Unexpected action specified for the request")

    format_desc = {f.DISPLAY_NAME: f
        for f in dm.views.get_export_formats()}.get(format_name)
    if format_desc is None:
        raise serializers.ValidationError(
            "Unknown format specified for the request")
    elif not format_desc.ENABLED:
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    queue = django_rq.get_queue("default")

    rq_job = queue.fetch_job(rq_id)
    if rq_job:
        last_task_update_time = timezone.localtime(db_task.updated_date)
        request_time = rq_job.meta.get('request_time', None)
        if request_time is None or request_time < last_task_update_time:
            rq_job.cancel()
            rq_job.delete()
        else:
            if rq_job.is_finished:
                file_path = rq_job.return_value
                if action == "download" and osp.exists(file_path):
                    rq_job.delete()

                    timestamp = datetime.strftime(last_task_update_time,
                        "%Y_%m_%d_%H_%M_%S")
                    filename = filename or \
                        "task_{}-{}-{}{}".format(
                        db_task.name, timestamp,
                        format_name, osp.splitext(file_path)[1])
                    return sendfile(request, file_path, attachment=True,
                        attachment_filename=filename.lower())
                else:
                    if osp.exists(file_path):
                        return Response(status=status.HTTP_201_CREATED)
            elif rq_job.is_failed:
                exc_info = str(rq_job.exc_info)
                rq_job.delete()
                return Response(exc_info,
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response(status=status.HTTP_202_ACCEPTED)

    try:
        if request.scheme:
            server_address = request.scheme + '://'
        server_address += request.get_host()
    except Exception:
        server_address = None

    ttl = dm.views.CACHE_TTL.total_seconds()
    queue.enqueue_call(func=callback,
        args=(db_task.id, format_name, server_address), job_id=rq_id,
        meta={ 'request_time': timezone.localtime() },
        result_ttl=ttl, failure_ttl=ttl)
    return Response(status=status.HTTP_202_ACCEPTED)
