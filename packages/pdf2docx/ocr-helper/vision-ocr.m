#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#import <Vision/Vision.h>

static double calcPaperShare(CGImageRef cg) {
    size_t w = CGImageGetWidth(cg);
    size_t h = CGImageGetHeight(cg);
    if (w == 0 || h == 0) return 1.0;

    CGColorSpaceRef cs = CGColorSpaceCreateDeviceRGB();
    CGContextRef ctx = CGBitmapContextCreate(NULL, w, h, 8, w * 4, cs, kCGImageAlphaNoneSkipLast);
    CGColorSpaceRelease(cs);
    if (!ctx) return 1.0;

    CGContextSetRGBFillColor(ctx, 1.0, 1.0, 1.0, 1.0);
    CGContextFillRect(ctx, CGRectMake(0, 0, w, h));
    CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), cg);

    const uint8_t *px = (const uint8_t *)CGBitmapContextGetData(ctx);
    if (!px) {
        CGContextRelease(ctx);
        return 1.0;
    }

    size_t totalPixels = w * h;
    size_t stride = totalPixels / 200000;
    if (stride < 1) stride = 1;

    size_t paper = 0, sampled = 0;
    for (size_t i = 0; i < totalPixels; i += stride) {
        size_t o = i * 4;
        uint8_t r = px[o], g = px[o + 1], b = px[o + 2];
        uint8_t minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
        if (minC >= 200) paper++;
        sampled++;
    }
    CGContextRelease(ctx);
    return sampled > 0 ? ((double)paper / (double)sampled) : 1.0;
}

static NSArray *rectToArray(CGRect r) {
    return @[
        @(r.origin.x),
        @(r.origin.y),
        @(r.origin.x + r.size.width),
        @(r.origin.y + r.size.height)
    ];
}

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSData *stdinData = [[NSFileHandle fileHandleWithStandardInput] readDataToEndOfFile];
        if (!stdinData || stdinData.length == 0) {
            fprintf(stderr, "empty stdin\n");
            return 2;
        }

        NSImage *img = [[NSImage alloc] initWithData:stdinData];
        if (!img) {
            fprintf(stderr, "cannot decode input image\n");
            return 2;
        }

        CGImageRef cg = [img CGImageForProposedRect:NULL context:nil hints:nil];
        if (!cg) {
            fprintf(stderr, "cannot get CGImage\n");
            return 2;
        }

        VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] init];
        request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
        request.usesLanguageCorrection = YES;
        if (@available(macOS 13.0, *)) {
            request.automaticallyDetectsLanguage = YES;
        }
        if (argc > 1 && strlen(argv[1]) > 0) {
            NSString *langStr = [NSString stringWithUTF8String:argv[1]];
            NSArray *langs = [langStr componentsSeparatedByString:@","];
            request.recognitionLanguages = langs;
        } else {
            // Default recognition priority: include English, Vietnamese, Chinese, Japanese, French, etc.
            NSError *supErr = nil;
            NSArray *supLangs = [request supportedRecognitionLanguagesAndReturnError:&supErr];
            if (supLangs && supLangs.count > 0) {
                request.recognitionLanguages = supLangs;
            }
        }

        VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:cg options:@{}];
        NSError *err = nil;
        if (![handler performRequests:@[request] error:&err]) {
            fprintf(stderr, "recognition failed: %s\n", err.localizedDescription.UTF8String ?: "unknown");
            return 3;
        }

        NSMutableArray *lines = [NSMutableArray array];
        for (VNRecognizedTextObservation *obs in request.results) {
            NSArray<VNRecognizedText *> *cands = [obs topCandidates:1];
            if (cands.count == 0) continue;
            VNRecognizedText *cand = cands.firstObject;
            NSString *s = cand.string;
            if (!s || s.length == 0) continue;

            NSMutableArray *chars = [NSMutableArray array];
            for (NSUInteger i = 0; i < s.length; i++) {
                NSRange r = NSMakeRange(i, 1);
                VNRectangleObservation *boxObs = [cand boundingBoxForRange:r error:nil];
                if (boxObs) {
                    [chars addObject:@{
                        @"t": [s substringWithRange:r],
                        @"b": rectToArray(boxObs.boundingBox)
                    }];
                } else {
                    [chars addObject:@{
                        @"t": [s substringWithRange:r],
                        @"b": @[@0.0, @0.0, @0.0, @0.0]
                    }];
                }
            }

            [lines addObject:@{
                @"t": s,
                @"c": @(cand.confidence),
                @"b": rectToArray(obs.boundingBox),
                @"chars": chars
            }];
        }

        double paper = calcPaperShare(cg);
        NSDictionary *dict = @{
            @"lines": lines,
            @"paper": @(paper)
        };

        NSData *outData = [NSJSONSerialization dataWithJSONObject:dict options:0 error:nil];
        if (outData) {
            [[NSFileHandle fileHandleWithStandardOutput] writeData:outData];
        }
        return 0;
    }
}
