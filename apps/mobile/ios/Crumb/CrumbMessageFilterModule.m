#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CrumbMessageFilterModule, NSObject)

RCT_EXTERN_METHOD(getStoredDrafts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearStoredDrafts:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
