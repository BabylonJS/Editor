import { IStringDictionary } from '../typings/typings';

export default class Request {
    /**
     * Sends a GET request
     * @param url: url of the request
     * @param headers: the request headers
     */
    public static Get<T> (url: string, headers: IStringDictionary<any>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'GET',
                headers: headers,
                success: (response: T) => resolve(response),
                error: (err) => reject(err)
            });
        });
    }

    /**
     * Sends a PUT request
     * @param url the url of the request
     * @param content the content to put
     * @param headers the request headers
     */
    public static Put<T> (url: string, content: any, headers: IStringDictionary<any>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            $.ajax({
                url: url,
                processData: false,
                data: content,
                type: 'PUT',
                headers: headers,

                success: () => resolve(),
                error: (err) => reject(err)
            });
        });
    }

    /**
     * Sends a POST request
     * @param url the url of the request
     * @param content the content to post
     * @param headers the request headers
     */
    public static Post<T> (url: string, content: any, headers: IStringDictionary<any>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                contentType: 'application/json',

                data: content,
                headers: headers,
                success: () => resolve(),
                error: (err: any) => reject(err)
            });
        });
    }
}