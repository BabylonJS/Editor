"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Request = /** @class */ (function () {
    function Request() {
    }
    /**
     * Sends a GET request
     * @param url: url of the request
     * @param headers: the request headers
     */
    Request.Get = function (url, headers) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: url,
                type: 'GET',
                headers: headers,
                success: function (response) { return resolve(response); },
                error: function (err) { return reject(err); }
            });
        });
    };
    /**
     * Sends a PUT request
     * @param url the url of the request
     * @param content the content to put
     * @param headers the request headers
     */
    Request.Put = function (url, content, headers) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: url,
                processData: false,
                data: content,
                type: 'PUT',
                headers: headers,
                success: function () { return resolve(); },
                error: function (err) { return reject(err); }
            });
        });
    };
    /**
     * Sends a POST request
     * @param url the url of the request
     * @param content the content to post
     * @param headers the request headers
     */
    Request.Post = function (url, content, headers) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: url,
                type: 'POST',
                contentType: 'application/json',
                data: content,
                headers: headers,
                success: function () { return resolve(); },
                error: function (err) { return reject(err); }
            });
        });
    };
    return Request;
}());
exports.default = Request;
//# sourceMappingURL=request.js.map