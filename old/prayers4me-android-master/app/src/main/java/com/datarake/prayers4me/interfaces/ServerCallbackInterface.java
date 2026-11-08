package com.datarake.prayers4me.interfaces;
import com.android.volley.VolleyError;

import org.json.JSONObject;

/**
 * Created by bogdan on 202/02/2018.
 */
public interface ServerCallbackInterface {

    void onSuccess(JSONObject response);
    void onErrorResponse(VolleyError error);
}