<template>
  <div id="viewshed" class="sm-panel" v-drag>
    <div class="sm-function-module-sub-section" v-stopdrag style="margin:0">
      <div class="sm-half-L">
        <label style="width: 35%;">{{Resource.addheight}}</label>
        <el-slider
          v-model="addheight"
          :min="1"
          :step="0.1"
          :max="10"
          input-size="mini"
          :debounce="500"
          tooltip-class="tooltip-class"
          style="width:63%"
        ></el-slider>
      </div>
      <div class="sm-half-L">
        <label style="width: 35%;">{{Resource.verticalFov}}</label>
        <el-slider
          v-model="verticalFov"
          :min="1"
          :max="179"
          input-size="mini"
          :debounce="500"
          tooltip-class="tooltip-class"
          style="width:63%"
        ></el-slider>
      </div>
      <div class="sm-half-L">
        <label style="width: 35%;">{{Resource.horizontalFov}}</label>
        <el-slider
          v-model="horizontalFov"
          :min="1"
          :max="179"
          input-size="mini"
          :debounce="500"
          tooltip-class="tooltip-class"
          style="width:63%"
        ></el-slider>
      </div>
      <div class="sm-half-L">
        <label style="width: 35%;">{{Resource.hintLineColor}}</label>
        <el-color-picker v-model="hintLineColor" size="mini" show-alpha style="width:63%"></el-color-picker>
      </div>
      <div class="sm-half-L" v-show="!visibleBody && !invisibleBody ">
        <label style="width: 35%;">{{Resource.visibleAreaColor}}</label>
        <el-color-picker v-model="visibleAreaColor" size="mini" show-alpha style="width:63%"></el-color-picker>
      </div>
      <div class="sm-half-L" v-show="!visibleBody && !invisibleBody ">
        <label style="width: 35%;">{{Resource.hiddenAreaColor}}</label>
        <el-color-picker v-model="hiddenAreaColor" size="mini" show-alpha style="width:63%"></el-color-picker>
      </div>
      <div class="sm-half-L" v-show="visibleBody">
        <label style="width: 35%;">{{Resource.visibleBodyColor}}</label>
        <el-color-picker v-model="visibleBodyColor" size="mini" show-alpha style="width:63%"></el-color-picker>
      </div>
      <div class="sm-half-L" v-show="invisibleBody ">
        <label style="width: 35%;">{{Resource.invisibleBodyColor}}</label>
        <el-color-picker v-model="invisibleBodyColor" size="mini" show-alpha style="width:63%"></el-color-picker>
      </div>

      <div class="sm-half-L">
        <label style="width:auto">
          <input type="checkbox" v-model="visibleBody" />
          {{Resource.displayVisualsBody}}
        </label>
        <label style="width:auto">
          <input type="checkbox" v-model="invisibleBody" />
          {{Resource.displayInvisibleBody}}
        </label>
        <label style="width:auto">
          <input type="checkbox" v-model="viewshedAnimation" />
          {{Resource.viewshedAnimation}}
        </label>
      </div>
      <div class="boxchild">
        <button type="button" class="tbtn" v-on:click="analysis">{{ Resource.analyze }}</button>
        <button type="button" class="tbtn tbtn-margin-left" @click="clear">{{ Resource.clear }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import viewshed from "./viewshed.js";
export default {
  name: "Sm3dViewshed",
  props: {
    //可视域体数据服务
    viewshedSpatialUrl: {
      type: String
    },
    //初始化观察者信息
    observerInformation: {
      type: Object
    },
    //方向角
    direction: {
      type: Number
    },
    //俯仰角
    pitch: {
      type: Number
    },
    //附加高度
    addheight: {
      type: Number
    },
    //可视域距离
    distance: {
      type: Number
    },
    //水平视角
    verticalFov: {
      type: Number
    },
    //垂直视角
    horizontalFov: {
      type: Number
    },
    //可视线颜色
    hintLineColor: {
      type: String
    },
    //可视区域颜色
    visibleAreaColor: {
      type: String
    },
    //不可视域颜色
    hiddenAreaColor: {
      type: String
    },
    //可视域体颜色
    visibleBodyColor: {
      type: String
    },
    //不可视域体颜色
    invisibleBodyColor: {
      type: String
    },
    //显示可视域体
    visibleBody: {
      type: Boolean
    },
    //显示不可视域体
    invisibleBody: {
      type: Boolean
    },
    //动态可视域设置
    viewshedAnimation: {
      type: Boolean
    },
    //动态可视域路线点
    DynamicLine: {
      type: Array
    },
    //动态分析行进速度
    DynamicSpeed: {
      type: Number
    }
  },

  setup(props) {
    let {
      visibleBody,
      invisibleBody,
      viewshedAnimation,
      analysis,
      clear,
      addheight,
      verticalFov,
      horizontalFov,
      hintLineColor,
      visibleAreaColor,
      hiddenAreaColor,
      visibleBodyColor,
      invisibleBodyColor
    } = viewshed(props);
    return {
      addheight,
      verticalFov,
      horizontalFov,
      hintLineColor,
      visibleAreaColor,
      hiddenAreaColor,
      visibleBodyColor,
      invisibleBodyColor,
      visibleBody,
      invisibleBody,
      viewshedAnimation,
      analysis,
      clear
    };
  }
};
</script>

