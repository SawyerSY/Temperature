var app = getApp();
// 成员变量
var deviceId;
var i = 0;
var serviceId = [];
var characteristicId = [];
var temperature = '0.0';
var firstPage;

const themeColor = '#4BBC6A'
const alertColor = '#E85E58'

function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}
// 1.打开适配器
function openAdapter() {
  wx.showLoading({
    title: '连接中'
  })

  wx.openBluetoothAdapter({
    success: function (res) {
      console.log("1.打开适配器成功", res)
      openDiscovery()
      setTimeout(function() {
        openDiscovery()
      }, 2000)
    },
    fail: function (res) {
      console.log("1.打开适配器失败!!!", res)
    },
  })
}
// 2.开始发现蓝牙设备
function openDiscovery() {
  wx.startBluetoothDevicesDiscovery({
    services: [],
    success: function (res) {
      console.log("2.开始发现蓝牙设备成功", res)
      getDevice()
    },
    fail: function (res) {
      console.log("2.开始发现蓝牙设备失败!!!", res)
    },
  })
}
// 3.获取蓝牙设备，并记录设备ID
function getDevice() {
  wx.getBluetoothDevices({
    success: function (res) {
      console.log("3.获取蓝牙设备，并记录设备ID成功", deviceId);
      i = 0;
      while (res.devices[i]) {
        if (res.devices[i].name == 'HC-05') {
          // 记录设备ID
          deviceId = res.devices[i].deviceId;
        }
        i++;
      }
      connectedDevice()
    }
  })
}
// 4.创建BLE连接
function connectedDevice() {
  wx.createBLEConnection({
    // 连接指定设备
    deviceId: deviceId,
    success: function (res) {
      console.log("4.创建BLE连接成功", res);
      getService()
    },
  })
}
// 5.获取BLE服务
function getService() {
  wx.getBLEDeviceServices({
    deviceId: deviceId,
    success: function (res) {
      console.log("5.获取BLE服务成功", res.services);
      i = 0;
      while (res.services[i]) {
        // 获取服务ID
        serviceId[i] = res.services[i].uuid;
        i++;
      }
      getCharacteristics()
    },
  })
}
// 6.获取特征值
function getCharacteristics() {
  wx.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceId[0],
    success: function (res) {
      console.log("6.获取特征值成功:", res.characteristics)
    }
  })
  wx.getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceId[1],
    success: function (res) {
      i = 0;
      while (res.characteristics[i]) {
        characteristicId[i] = res.characteristics[i].uuid;
        // console.log(characteristicId[i]);
        i++;
      }
    }
  })
  startNotify()
}
// 7.监听BLE特征值改变
function startNotify() {
  wx.notifyBLECharacteristicValueChange({
    state: true,
    deviceId: deviceId,
    serviceId: serviceId[1],
    characteristicId: characteristicId[0],
    success: function (res) {
      console.log('7.监听BLE特征值改变成功', res.errMsg)
      wx.hideLoading({
        success: (res) => {
          wx.showToast({
            title: '连接设备成功',
            duration: 1000,
            icon: 'success'
          })
        },
      })
    }
  })
  wx.onBLECharacteristicValueChange(function (res) {
    temperature = analyseTemperature(ab2hex(res.value))
    firstPage.setData({
      temperatureText: temperature
    })
    if (temperature >= 37.3) {
      firstPage.setData({
        temperatureColor: alertColor
      })
    } else {
      firstPage.setData({
        temperatureColor: themeColor
      })
    }
    save(temperature)
    console.log('new device list has founded')
    console.log('characteristic value comed:', temperature)
  })
}
// 解析返回值
function analyseTemperature(hexParam) {
  var shi = hexParam.substr(15, 1)
  var ge = hexParam.substr(17, 1)
  var xiaoshu = hexParam.substr(21, 1)
  return shi + ge + '.' + xiaoshu
}
// 数据库操作
function save(temperature) {
  var util = require('../../utils/util.js')
  var historyData = app.globalData.historyData;
  var currentLength = wx.getStorageSync('historyData').length
  var pushData = {
    'id': currentLength + 1,
    'date': util.formatDate(new Date),
    'time': util.formatDateTime(new Date),
    'temperature': temperature
  }
  historyData.push(pushData)
  wx.setStorageSync('historyData', historyData)
}

Page({
  data: {
    temperatureText: temperature,
    temperatureColor: themeColor
  },

  // 生命周期
  onShow: function () {
    // var util = require('../../utils/util.js')
    // var historyData = app.globalData.historyData;
    // var currentLength = wx.getStorageSync('historyData').length
    // var pushData  = {'id': currentLength + 1, 'dateTime': util.formatTime(new Date), 'temperature': temperature}
    // historyData.push(pushData)
    // wx.setStorageSync('historyData', historyData)
  },

  // 自定义方法
  initBlue: function () {
    firstPage = this
    openAdapter()
  },
  showHistory: function () {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  }
})