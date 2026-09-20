# Functional Specification (draft CGPT V2)

## 1\. System Role

* Sensor head only, no actuation logic  
* Acts as an edge sensing node  
* Streams raw and lightly processed data to cloud  
* ESP32-P4 is the only compute element in the head

## 2\. Physical Architecture

* Sensor head mechanically isolated from:  
  * servos  
  * structural load paths

* Microphones acoustically isolated:  
  * horn assemblies decoupled from head shell

* Power isolation:  
  * servo power never enters sensor head  
  * logic power enters head only

## 3\. Sensors

### Cameras (2)

* Camera A (context / wide)  
  * MIPI-CSI camera  
  * Continuous situational awareness

* Camera B (detail / utility)  
  * Parallel (DVP) camera  
  * Snapshot / task-focused imaging

### Audio

* Two digital MEMS microphones  
  * I²S interface  
  * Positioned for spatial / directional inference  
  * External horn geometry handled mechanically

### Explicitly excluded (this version)

* Proximity / ToF / LiDAR  
* IMU  
* On-head actuation feedback

## 4\. Control & Motion

* Two servos exist outside sensor head  
* PWM control signals originate in head  
* Servo power sourced in base

## 5\. Power

* Single external 5 V AC wall adapter  
* Base distributes:  
  * Servo 5 V rail  
  * Logic 5 V rail (to head)  
* ESP32-P4 generates 3.3 V locally  
* Two downstream logic rails:  
  * 3.3 V\_CAM  
  * 3.3 V\_AUDIO

This spec is now frozen for BOM selection.
