import { useState } from "react";
import { openCamera } from "@privateid/ultra-web-sdk-alpha";
import { isIphoneCC, isMobile, mapDevices } from "../utils";
import { CameraFaceMode } from "@privateid/ultra-web-sdk-alpha/dist/types";

const useCamera = (
  element = "userVideo",
  requestFaceMode: CameraFaceMode = CameraFaceMode.front,
  requireHD = false,
  onCameraFail = () => {},
  isDocumentScan = false,
  canvasResolution: { width: number; height: number } | null = null
): {
  init: () => Promise<void>;
  devices: Array<{ label: string; value: string }>;
  ready: boolean;
  faceMode: any;
  device: string;
  setDevice: (value: ((prevState: string) => string) | string) => void;
  settings?: any;
  capabilities?: any;
} => {
  // Initialize the state
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [device, setDevice] = useState("");
  const [faceMode, setFaceMode] = useState<any>(null);
  const [cameraFeatures, setCameraFeatures] = useState({});
  const enableHDMode = requireHD;
  const init = async () => {
    console.log({ ready });
    if (ready) return;
    try {
      console.log("Opening Camera init");
      const startTime = performance.now();
      const {
        devices = [],
        faceMode,
        settings,
        capabilities,
      } = await openCamera({
        videoElementId: element,
        deviceId: null as any,
        requestFaceMode,
        canvasResolution: canvasResolution as any,
        isDocumentScan: isDocumentScan && isMobile,
      });
      const endTime = performance.now(); // End timing
      const initializationTime = endTime - startTime;
      console.log("Camera initialization time:", initializationTime);
      // console.log({ settings, capabilities });
      if (isIphoneCC(capabilities)) {
        await setResolutionForIphoneCC();
      }

      setCameraFeatures({ settings, capabilities });
      setFaceMode(faceMode);
      if (Array.isArray(devices) && devices?.length > 0) {
        console.log("=====> if case", devices);
        const selectedDevice = devices.find(
          (device) =>
            device.deviceId === settings?.deviceId ||
            device.groupId === settings?.groupId
        );
        const options = devices?.map(mapDevices);
        console.log("after device.map:", options);
        setDevices(options);
        setDevice(selectedDevice?.deviceId as string);
      }

      if (devices?.length === 0) {
        onCameraFail();
      } else {
        setReady(true);
      }
    } catch (e) {
      onCameraFail();
      console.log("Error Message", e);
    }
  };

  return {
    ready,
    init,
    devices,
    device,
    setDevice,
    faceMode,
    ...cameraFeatures,
  };
};

export const setResolutionForIphoneCC = async () => {
  const video = document.getElementById("userVideo") as any;
  const mediaStream = video.srcObject;
  const track = await mediaStream.getTracks()[0];
  const capabilities = track.getCapabilities() ? track.getCapabilities() : null;
  if (
    capabilities &&
    capabilities?.height?.max === 1440 &&
    capabilities?.width?.max === 1920
  ) {
    await track.applyConstraints({
      advanced: [
        {
          width: 1920,
          height: 1440,
        },
      ],
    });
  }
};

export default useCamera;
