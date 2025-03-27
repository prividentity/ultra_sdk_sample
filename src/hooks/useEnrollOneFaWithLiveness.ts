import {
  enroll,
  getRawFaceValidationStatus,
  getRawSpoofStatusMessage,
  pkiEncryptData,
} from "@privateid/ultra-web-sdk-alpha";
import { getStatusMessage } from "@privateid/ultra-web-sdk-alpha";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ImageDataToBase64 } from "utils/ImageDatatoBlob";

let skipAntispoofProcess = false;
let identifierGlobal: any = undefined;
let collectionNameGlobal: any = undefined;

let mf_count = 3;
let portrait: ImageData | null = null;
let max_spoof_attempt = 3;
let spoof_attempt = 0;
let count_enroll = 0;
let isRunning = false;
const useEnroll = (onSuccess: () => void, onFailure: () => void) => {
  const [enrollStatus, setEnrollStatus] = useState("");
  const [searchParams] = useSearchParams();
  const [enrollValidationStatus, setEnrollValidationStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [enrollEmbeddings, setEnrollEmbeddings] = useState("");
  const [enrollPUID, setEnrollPUID] = useState("");
  const [enrollImageData, setEnrollImageData] = useState<any>("");

  const debugType = searchParams.get("debug_type");

  const mf_count_override = searchParams.get("mf_count")
    ? Number(searchParams.get("mf_count"))
    : mf_count;

  const final_spoof_attempt = searchParams.get("spoof_attempt")
    ? Number(searchParams.get("spoof_attempt"))
    : max_spoof_attempt;

  let enrollTokenCurrent;

  const callback = async (result: any) => {
    console.log("enroll callback hook result:", result);
    console.log("skipping antispoof?", skipAntispoofProcess);
    const token = result.mf_token;
    if (token && result?.face_validation_status >= 0) {
      setProgress((p) => {
        if (p >= 100) return 100;
        return p + 100 / mf_count_override;
      });
    } else {
      setProgress(0);
    }
    if (result?.api_response?.success) {
      if (result?.api_response?.tryAgain) {
        doEnroll(
          result.mf_token,
          skipAntispoofProcess,
          collectionNameGlobal,
          identifierGlobal
        );
      } else {
        setProgress(100);
        setEnrollValidationStatus("Success");
        setEnrollImageData(result.iso_image);
        setEnrollEmbeddings("Success");
        onSuccess();
        isRunning = false;
      }
    } else if (
      result?.api_response &&
      result?.api_response?.statusCode !== 200
    ) {
      setProgress(0);
      onFailure();
      isRunning = false;
    } else if (result.antispoof_status === 1) {
      spoof_attempt++;
      setProgress(0);
      if (spoof_attempt >= final_spoof_attempt) {
        console.log("Spoof attempt exceeded");

        // do your logic here if there is spoof attempt 
      } else {
        doEnroll(
          result.mf_token,
          skipAntispoofProcess,
          collectionNameGlobal,
          identifierGlobal
        );
      }
    } else {
      setEnrollValidationStatus(
        debugType === "3"
          ? `Face Validation: ${getRawFaceValidationStatus(
              result.face_validation_status
            )} ---
     
        Anti spoof: ${getRawSpoofStatusMessage(result.antispoof_status)}`
          : getStatusMessage(result.face_validation_status)
      );
      setEnrollStatus(result.face_validation_status);
      doEnroll(
        result.mf_token,
        skipAntispoofProcess,
        collectionNameGlobal,
        identifierGlobal
      );
    }
  };

  const enrollUserOneFa = async () => {
    if (!isRunning) {
      doEnroll();
      isRunning = true;
    }
  };

  const doEnroll = async (
    token = "",
    skipAntispoof = false,
    collectionName = "",
    identifier = ""
  ) => {
    console.log("ENROLLING", count_enroll);

    enrollTokenCurrent = token;
    skipAntispoofProcess = skipAntispoof;
    collectionNameGlobal = collectionName;
    identifierGlobal = identifier;
    // eslint-disable-next-line no-unused-vars
    const enrollPortrait = await enroll({
      callback: callback,
      returnPortrait: true,
      config: {
        input_image_format: "rgba",
        mf_token: token,
        mf_count_override,
        // skip_antispoof: true,  default antispoof is enable. if skip_antispoof passed as true it will not do antispoof
      },
    });

    portrait = enrollPortrait as ImageData;
    if (debugType === "3") {
      console.log("image :", ImageDataToBase64(enrollPortrait as ImageData));
    }
  };

  return {
    enrollEmbeddings,
    enrollPUID,
    enrollStatus,
    enrollValidationStatus,
    enrollUserOneFa,
    enrollImageData,
    progress,
  };
};

export default useEnroll;
