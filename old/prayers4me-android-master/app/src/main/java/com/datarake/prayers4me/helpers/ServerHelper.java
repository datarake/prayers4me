package com.datarake.prayers4me.helpers;

import android.content.Context;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.datarake.prayers4me.BuildConfig;
import com.datarake.prayers4me.interfaces.ServerCallbackInterface;
import com.google.gson.Gson;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by bogdanburdalescu on 02/02/2018.
 */

public class ServerHelper {

    private Context context;
    private RequestQueue queue;
    //public List<Algorithm> algorithms;
    //public Algorithm currentAlgorithm;

    public ServerHelper(final Context context) {
        this.context = context;
        queue = Volley.newRequestQueue(context);
    }


    public void getTokenRequest(final ServerCallbackInterface callback) {
        String url = BuildConfig.SERVER_URL + BuildConfig.GET_TOKEN_URL;

        JSONObject jsonObject = new JSONObject();

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.POST, url, jsonObject, new Response.Listener<JSONObject>() {
            @Override
            public void onResponse(JSONObject response) {

                try {
                    if (response.getBoolean("success")) {
                        JSONObject data = response.getJSONObject("data");
                        JSONArray array = data.getJSONArray("algorithms");

                        Gson gson = new Gson();

//                        Type type = new TypeToken<List<Algorithm>>() {}.getType();
//                        algorithms = gson.fromJson(String.valueOf(array), type);
//
//                        int algorithmIndex = 0;
//
//                        int algorithmId = AppController.getInstance().retrieveTableTennisAlgorithmId(context.getApplicationContext());
//                        for(int i = 0; i < algorithms.size(); i++) {
//                            if(algorithms.get(i).id == algorithmId)
//                                algorithmIndex = i;
//                        }
//                        setCurrentAlgorithm(algorithmIndex);
                    }

                } catch (JSONException e) {
                    e.printStackTrace();
                }

                callback.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                callback.onErrorResponse(error);
            }
        })
        {
            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                HashMap<String, String> headers = new HashMap<>();
                headers.put("Content-Type", "application/json");
                //headers.put("Authorization", AppController.getInstance().getToken());
                return headers;
            }
        };

        queue.add(jsonObjectRequest);
    }
}
