
/* 时间插值实现动态可视域  */

// 引入依赖
import { watch, ref, reactive, toRefs, onBeforeUnmount, onMounted } from "vue";
import tool from '../../../js/tool/tool.js'        //提示等工具
import resource from '../../../js/local/lang.js'  //语言资源
import { storeState, storeDate } from '../../../store/store.js'   //简单局部状态管理
import { initHandler, handlerDrawing, clearHandlerDrawing } from "../../../js/common/drawHandler.js"    //公共handler.js
import createTooltip from '../../../js/tool/tooltip2.js'

function viewshed(props) {

    // 设置默认值数据
    let state = reactive({
        viewshedSpatialUrl: "http://www.supermapol.com/realspace/services/spatialAnalysis-data_all/restjsr/spatialanalyst/geometry/3d/viewshedbody.json",
        observerInformation: null,  //观察者信息
        direction: 1.0,    //方向
        pitch: 1.0,        //俯仰角度
        addheight: 1.8,   //附加高度
        distance: 200,   //距离
        verticalFov: 60,   //  垂直视角
        horizontalFov: 90,   //水平视角
        hintLineColor: "rgb(212,202,45)",   //提示线颜色
        visibleAreaColor: "rgba(9,199,112,0.5)",  //可视区域颜色
        hiddenAreaColor: "rgba(238,114,22,0.5)",  //不可视区域颜色
        visibleBodyColor: "rgba(9,199,112,0.7)",   //可视域体颜色
        invisibleBodyColor: "rgba(238,114,22,0.7)",  //不可视域体颜色
        visibleBody: false,   //显示可视域体
        invisibleBody: false,   //显示不可视域体

        viewshedAnimation: false,  //动画演示
        AnimationOptions: {   //动画设置
            points: [],
            speed: 10
        }
    });

    // 传入props改变默认值
    if (props) {
        for (let key in props) {
            if (state.hasOwnProperty(key)) {
                state[key] = props[key]
            } else {
                tool.Message.errorMsg(resource.AttributeError + key);
            }
        }
    }

    // 初始化数据
    let viewshed3D, handler, s3mInstanceColc, scene, startPosition, carModel, carPosition, timers=[], clearClock;
    let tooltip, tipFlag = true;
    if (storeState.isViewer) {
        init()
    }
    //viewer 初始化完成的监听
    watch(() => storeState.isViewer, val => {
        if (val) {
            init()
        }
    });
    function init() {
        tooltip = createTooltip(viewer._element);
        scene = viewer.scene;
        viewshed3D = new Cesium.ViewShed3D(scene);
        handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
        viewshed3D.hintLineColor = Cesium.Color.fromCssColorString(
            state.hintLineColor
        );
        viewshed3D.visibleAreaColor = Cesium.Color.fromCssColorString(
            state.visibleAreaColor
        );
        viewshed3D.hiddenAreaColor = Cesium.Color.fromCssColorString(
            state.hiddenAreaColor
        );
        s3mInstanceColc = new Cesium.S3MInstanceCollection(scene._context);
        viewer.scene.primitives.add(s3mInstanceColc);
    };

    /*
     ***分析模块***
    */

    //分析

    function analysis() {
        viewer.enableCursorStyle = false;
        viewer._element.style.cursor = "";
        document.body.classList.add("measureCur");

        if (state.viewshedAnimation) {
            handlerPolyline()
        } else {
            if (tipFlag) {   //只提示一次
                tooltip.showAt(' <p>点击鼠标左键确认观察者位置</p> <p>右键单击结束分析</p>', '300px');
                tipFlag = false
            }
            LEFT_CLICK();
        }
    }

    //   点击左键确认观察者点
    function LEFT_CLICK() {
        handler.setInputAction(function (e) {
            let position = scene.pickPosition(e.position);
            console.log('clickPosition：', position)
            startPosition = position;  //记录分析观察者笛卡尔坐标
            let p = tool.CartesiantoDegrees(position) // 将获取的点的位置转化成经纬度
            p[2] += Number(state.addheight);  //添加附加高度
            viewshed3D.viewPosition = p;
            viewshed3D.build();
            // 观察者信息记录
            state.observerInformation = p;
            document.body.classList.remove("measureCur");
            removeInputAction('LEFT_CLICK')
            MOUSE_MOVE();
            RIGHT_CLICK();
            // 添加观察者点
            let p2 = Cesium.Cartesian3.fromDegrees(p[0], p[1], p[2]);
            addPoint(p2)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    };
    function addPoint(p) {
        viewer.entities.removeById('viewshedPoint');
        viewer.entities.add(new Cesium.Entity({
            id: 'viewshedPoint',
            point: new Cesium.PointGraphics({
                color: colorUpdate(state.hiddenAreaColor),
                pixelSize: 8
            }),
            position: p
        }));
    }
    // 鼠标移动实时分析
    function MOUSE_MOVE() {
        handler.setInputAction(function (e) {
            // tooltip.setVisible(false);
            //获取鼠标屏幕坐标,并将其转化成笛卡尔坐标
            let position = e.endPosition;
            let endPosition = scene.pickPosition(position);
            //计算该点与视口位置点坐标的距离
            let distance = Cesium.Cartesian3.distance(startPosition, endPosition);
            if (distance > 0) {
                let p2 = tool.CartesiantoDegrees(endPosition) // 将获取的点的位置转化成经纬度
                // 通过该点设置可视域分析对象的距离及方向
                viewshed3D.setDistDirByPoint(p2);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }

    // //鼠标右键确认分析距离和方向，不再执行鼠标移动事件中对可视域的操作
    function RIGHT_CLICK() {
        handler.setInputAction(function (e) {
            state.direction = viewshed3D.direction.toFixed(2);
            state.pitch = viewshed3D.pitch.toFixed(2);
            state.distance = viewshed3D.distance.toFixed(2);
            state.horizontalFov = viewshed3D.horizontalFov;
            state.verticalFov = viewshed3D.verticalFov;
            removeInputAction('MOUSE_MOVE');
            removeInputAction('RIGHT_CLICK');
            if (state.visibleBody) {
                getVisibleResult()
            }
            if (state.invisibleBody) {
                getInVisibleResult()
            }
            tooltip.setVisible(false);
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    //移除鼠标事件
    function removeInputAction(type) {
        switch (type) {
            case 'LEFT_CLICK':
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.LEFT_CLICK
                );
                break;
            case 'MOUSE_MOVE':
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.MOUSE_MOVE
                );
                break;
            case 'RIGHT_CLICK':
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.RIGHT_CLICK
                );
                break;
            case 'ALL':
            default:
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.LEFT_CLICK
                );
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.MOUSE_MOVE
                );
                handler.removeInputAction(
                    Cesium.ScreenSpaceEventType.RIGHT_CLICK
                );
                break;
        }

    }

    // 可视域体走数据服务
    function getVisibleResult() {
        let obj = viewshed3D.getViewshedParameter();
        let geometryViewShedBodyvisibleParameter = {
            viewerPoint: obj.viewPosition,
            point3DsList: obj.point3DList,
            radius: obj.distance,
            lonlat: true,
            viewShedType: "VISIBLEBODY"
        };
        let queryData = JSON.stringify(geometryViewShedBodyvisibleParameter);
        let color = Cesium.Color.fromCssColorString(state.visibleBodyColor);

        //先发送POST请求
        window.axios
            .post(state.viewshedSpatialUrl, queryData)
            .then(function (response) {
                //再发送一次GET请求  获取到运算结果
                window.axios
                    .get(response.data.newResourceLocation + ".json")
                    .then(function (response) {
                        let data = response.data;
                        //失败 没有内容
                        if (data.geometry == null) {
                            tool.Message.errorMsg('获取geometry失败')
                            return;
                        }

                        //将二进制流构建arrayBuffer 添加至S3MInstanceCollection
                        let u8 = new Uint8Array(data.geometry.model);
                        let ab = u8.buffer;

                        //注意  若添加多个模型 请保证各个名称唯一  否则可能引起显示错乱问题
                        s3mInstanceColc.add(
                            "VeiwshedBody",
                            {
                                id: 1,
                                position: Cesium.Cartesian3.fromDegrees(
                                    data.geometry.position.x,
                                    data.geometry.position.y,
                                    data.geometry.position.z
                                ),
                                hpr: new Cesium.HeadingPitchRoll(0, 0, 0),
                                //scale : new Cesium.Cartesian3(39.37007900000045,39.37007900000045,39.37007900000045),
                                color: color
                                //offset : new Cesium.Cartesian3(0,0,690)
                            },
                            ab, false
                        );
                        // 分析区域颜色和可视域体颜色会影响，所以先透明
                        viewshed3D.visibleAreaColor = Cesium.Color.fromCssColorString("rgba(0,0,0,0)");
                        viewshed3D.hiddenAreaColor = Cesium.Color.fromCssColorString("rgba(0,0,0,0)");
                        // // 传到store可以做gpu查询
                        data.geometry["VeiwshedBody"] = resource.VeiwshedBody;
                        storeDate.geometrys["VeiwshedBody"] = data.geometry;

                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            })
            .catch(function (error) {
                console.log(error);
            });
    };

    function getInVisibleResult() {
        let obj = viewshed3D.getViewshedParameter();
        let geometryViewShedBodyvisibleParameter = {
            viewerPoint: obj.viewPosition,
            point3DsList: obj.point3DList,
            radius: obj.distance,
            lonlat: true,
            viewShedType: "HIDDENBODY"
        };
        let queryData = JSON.stringify(geometryViewShedBodyvisibleParameter);
        let color = Cesium.Color.fromCssColorString(state.invisibleBodyColor);
        //先发送POST请求
        window.axios
            .post(state.viewshedSpatialUrl, queryData)
            .then(function (response) {
                //再发送一次GET请求  获取到运算结果
                window.axios
                    .get(response.data.newResourceLocation + ".json")
                    .then(function (response) {
                        let data = response.data;
                        //失败 没有内容
                        if (data.geometry == null) {
                            tool.Message.errorMsg('获取geometry失败')
                            return;
                        }

                        //将二进制流构建arrayBuffer 添加至S3MInstanceCollection
                        let u8 = new Uint8Array(data.geometry.model);
                        let ab = u8.buffer;
                        //注意  若添加多个模型 请保证各个名称唯一  否则可能引起显示错乱问题
                        s3mInstanceColc.add(
                            "VeiwshedBodyHidden",
                            {
                                id: 1,
                                position: Cesium.Cartesian3.fromDegrees(
                                    data.geometry.position.x,
                                    data.geometry.position.y,
                                    data.geometry.position.z
                                ),
                                hpr: new Cesium.HeadingPitchRoll(0, 0, 0),
                                //scale : new Cesium.Cartesian3(39.37007900000045,39.37007900000045,39.37007900000045),
                                color: color
                                //offset : new Cesium.Cartesian3(0,0,690)
                            },
                            ab, false
                        );
                        viewshed3D.visibleAreaColor = Cesium.Color.fromCssColorString("rgba(0,0,0,0)");
                        viewshed3D.hiddenAreaColor = Cesium.Color.fromCssColorString("rgba(0,0,0,0)");
                        // // 传到store可以做gpu查询
                        data.geometry["VeiwshedBodyHidden"] = resource.VeiwshedBodyHidden;
                        storeDate.geometrys["VeiwshedBodyHidden"] = data.geometry;
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    // 清除
    function clear() {
        tooltip.setVisible(false);
        viewer.entities.removeById('viewshedPoint');
        document.body.classList.remove("measureCur");
        viewshed3D.distance = 0.00001;
        viewshed3D.viewPosition = [0, 0, 0];
        state.visibleBody = false;
        state.invisibleBody = false;
        s3mInstanceColc.removeCollection("VeiwshedBody");
        s3mInstanceColc.removeCollection("VeiwshedBodyHidden");
        state.observerInformation = null;
        if (clearClock) clearClock();
        viewer.entities.removeById('carModel');
        carModel = null;
        clearTimer();
        state.viewshedAnimation = false;
        clearHandlerDrawing("Polyline");
    };

    /*
    动态可视域模块
    */
    //绘制路线
    function handlerPolyline() {
        if (!window.handlerPolyline) {
            initHandler("Polyline");
        }
        if (carModel) {
            clear();
            viewer.enableCursorStyle = false;
            viewer._element.style.cursor = "";
            document.body.classList.add("measureCur");
            state.viewshedAnimation = true;
        }
        handlerDrawing("Polyline", Cesium.ClampMode.Ground ).then(
            res => {
                let handlerPolyline = window.handlerPolyline;
                handlerPolyline.polyline.show = false;
                window.polylineTransparent.show = true; //半透线隐藏
                handlerPolyline.deactivate();
                state.AnimationOptions.points = res.result.object._positions;
                tooltip.setVisible(false);
                if (state.AnimationOptions.points.length < 2) {
                    tool.Message.warnMsg('至少需要两个点！');
                    return; };
                addCarmodel();
            },
            (err) => {
                console.log(err);
            }
        );
        window.handlerPolyline.activate();
    }

    // 添加动态可视域动画模型
    function addCarmodel() {
        viewer.entities.removeById('viewshedPoint');
        if (carModel) return;
        carModel = viewer.entities.add({
            id: "carModel",
            position: new Cesium.CallbackProperty(() => {
                return carPosition;
            }, false),
            // orientation: orientation,
            model: {
                uri: "public/SampleData/models/Cesium_Ground.gltf",
                scale: 1
            },
        });

        carAnimation(state.AnimationOptions.points, state.AnimationOptions.speed)
    }

    function carAnimation(points, v) {  //点数组和速度
        if (!points || typeof (points) != 'object') return;
        if (!v) v = 10;
        let t = [];
        let time = 0;
        for (let i = 1; i < points.length; i++) {
            let distance = Cesium.Cartesian3.distance(points[i - 1], points[i]);
            t.push((distance / v).toFixed(3));
            let startTime = Cesium.JulianDate.fromDate(new Date(2019, 2, 25, 16));
            let endTime = Cesium.JulianDate.addSeconds(startTime, Number(t[i - 1]), new Cesium.JulianDate());
            time += i==1?0: Number(t[i - 2]) * 1000 ;
            let timer = setTimeout(() => {
                changeCarPosition(startTime, points[i - 1], endTime, points[i], i + 1)
            }, time);
            timers.push(timer)
        }
    }
    function changeCarPosition(startTime, start_Position, endTime, end_Position, index) {
        if (clearClock) clearClock();
        viewer.clock.startTime = startTime.clone();
        viewer.clock.stopTime = endTime.clone();
        viewer.clock.currentTime = startTime.clone();
        viewer.clock.multiplier = 1;
        viewer.timeline.zoomTo(startTime, endTime);
        let carPositionProperty = new Cesium.SampledPositionProperty();
        carPositionProperty.addSample(startTime, start_Position);
        carPositionProperty.addSample(endTime, end_Position);
        let getAngleAndRadian = tool.getAngleAndRadian(start_Position, end_Position);
        viewshed3D.distance = state.distance;
        viewshed3D.build();
        viewshed3D.direction = getAngleAndRadian.angle;
        let hpr = new Cesium.HeadingPitchRoll(getAngleAndRadian.radian - Math.PI / 2, 0, 0);
        let Position = carPositionProperty.getValue(viewer.clock.currentTime);
        let orientation = Cesium.Transforms.headingPitchRollQuaternion(Position, hpr);
        viewer.entities.getById('carModel').orientation = orientation
        clearClock = viewer.clock.onTick.addEventListener(function () {
            let currentTime = Cesium.JulianDate.clone(viewer.clock.currentTime);
            if (currentTime.secondsOfDay > endTime.secondsOfDay) {
                clearClock();
                return;
            }
            carPosition = carPositionProperty.getValue(currentTime);
            let p = tool.CartesiantoDegrees(carPosition) // 将获取的点的位置转化成经纬度
            p[2] += Number(state.addheight + 2);  //添加附加高度
            viewshed3D.viewPosition = p;
        })
    }

    function clearTimer(i){
        if(i){
            clearTimeout(timers[i]);
            return;
        }
        timers.forEach((timer,index) => {
                clearTimeout(timer);
                timers.splice(index,1)
        });
    }

    // 监听
    watch(() => state.visibleBody, val => {
        if (val && state.observerInformation) {
            getVisibleResult();
        } else {
            s3mInstanceColc.removeCollection("VeiwshedBody");
            if (!state.invisibleBody) {
                viewshed3D.visibleAreaColor = Cesium.Color.fromCssColorString(state.visibleAreaColor);
                viewshed3D.hiddenAreaColor = Cesium.Color.fromCssColorString(state.hiddenAreaColor);
            }
            if (storeDate.geometrys.VeiwshedBody) {
                delete storeDate.geometrys.VeiwshedBody;
            }
        }
    });
    watch(() => state.invisibleBody, val => {
        if (val && state.observerInformation) {
            getInVisibleResult();
        } else {
            s3mInstanceColc.removeCollection("VeiwshedBodyHidden");
            if (!state.visibleBody) {
                viewshed3D.visibleAreaColor = Cesium.Color.fromCssColorString(state.visibleAreaColor);
                viewshed3D.hiddenAreaColor = Cesium.Color.fromCssColorString(state.hiddenAreaColor);
            }
            if (storeDate.geometrys.VeiwshedBodyHidden) {
                delete storeDate.geometrys.VeiwshedBodyHidden;
            }
        }
    });
    watch(() => state.addheight, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        if (state.observerInformation) {
            state.observerInformation[2] += parseFloat(val);
            viewshed3D.viewPosition = state.observerInformation;
        }

    });
    watch(() => state.pitch, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        viewshed3D.pitch = parseFloat(val);
    });
    watch(() => state.direction, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        viewshed3D.direction = parseFloat(val);
    });
    watch(() => state.distance, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        viewshed3D.distance = parseFloat(val);
    });
    watch(() => state.verticalFov, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        viewshed3D.verticalFov = parseFloat(newValue);
    });
    watch(() => state.horizontalFov, val => {
        if (val === '' || val < 0) {    // 避免删除导致崩溃
            val = 0
        }
        viewshed3D.horizontalFov = parseFloat(val);
    });
    watch(() => state.hintLineColor, val => {
        viewshed3D.hintLineColor = colorUpdate(val);
    });
    watch(() => state.visibleAreaColor, val => {
        viewshed3D.visibleAreaColor = colorUpdate(val);
    });
    watch(() => state.visibleBodyColor, val => {
        s3mInstanceColc.getInstance("VeiwshedBody", 1).updateColor(colorUpdate(val));
    });
    watch(() => state.hiddenAreaColor, val => {
        viewshed3D.hiddenAreaColor = colorUpdate(val);
    });
    watch(() => state.invisibleBodyColor, val => {
        s3mInstanceColc.getInstance("VeiwshedBodyHidden", 1).updateColor(colorUpdate(val));
    });
    watch(() => state.viewshedAnimation, val => {
        if (val) {
            tooltip.setVisible(false);
            viewer.entities.removeById('viewshedPoint');
            document.body.classList.remove("measureCur");
            viewshed3D.distance = 0.00001;
            viewshed3D.viewPosition = [0, 0, 0];
            state.visibleBody = false;
            state.invisibleBody = false;
            state.observerInformation = null;
            tooltip.showAt('<p>点击分析按钮激活事件</p><p>点击鼠标左键确认模型移动路线</p><p>单击右键结束分析</p>', '300px');
        } else {
            clear()
        }
    });

    function colorUpdate(val) {
        if (val == "") return;
        return Cesium.Color.fromCssColorString(val);
    }
    // 销毁
    onBeforeUnmount(() => {
        clear();
        if (s3mInstanceColc) {
            s3mInstanceColc.destroy();
        }
        viewshed3D.destroy();
        handler.destroy();

        viewshed3D = undefined;
        handler = undefined;

        s3mInstanceColc = undefined;

    })

    return {
        ...toRefs(state),
        analysis,
        clear
    };

};

export default viewshed

