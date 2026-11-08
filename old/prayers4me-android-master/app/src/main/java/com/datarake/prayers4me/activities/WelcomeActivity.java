package com.datarake.prayers4me.activities;

import android.os.Bundle;
import android.content.Intent;
import android.databinding.DataBindingUtil;
import android.view.View;

import com.android.volley.VolleyError;
import com.datarake.prayers4me.databinding.ActivityWelcomeBinding;
import com.datarake.prayers4me.R;
import com.datarake.prayers4me.helpers.LocalValuesHelper;
import com.datarake.prayers4me.helpers.ServerHelper;
import com.datarake.prayers4me.interfaces.ServerCallbackInterface;

import org.json.JSONException;
import org.json.JSONObject;

public class WelcomeActivity extends BaseActivity {

    private ActivityWelcomeBinding binding;
    private ServerHelper serverHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_welcome);

        LocalValuesHelper.getInstance().init(getApplicationContext());

        binding = DataBindingUtil.setContentView(this, R.layout.activity_welcome);

        binding.btnLanguage.setOnClickListener(btnLanguageClicked);
        binding.btnForOthers.setOnClickListener(btnForOthersClicked);
        binding.btnForMe.setOnClickListener(btnForMeClicked);

        serverHelper = new ServerHelper(this);

        prepareScreen();

        if(LocalValuesHelper.getInstance().isFirstTime()) {

            serverHelper.getTokenRequest(new ServerCallbackInterface() {
                @Override
                public void onSuccess(JSONObject response) {
                    try {
                        if (response.getBoolean("success")) {
                            /*binding.startButton.setVisibility(View.INVISIBLE);
                            invalidateOptionsMenu();

                            JSONObject data = response.getJSONObject("data");
                            gameId = data.getInt("gameId");
                            int scoreA = data.getInt("scoreA");
                            int scoreB = data.getInt("scoreB");
                            cheerId = data.getInt("cheerId");
                            cheerMessage = data.getString("cheerMessage");

                            showScores(false);
                            callAICoachResponse(cheerMessage, Integer.toString(scoreA), Integer.toString(scoreB));
*/
                        } else {
                            //speak("I got an error from server");
                        }

                    } catch (JSONException e) {
                        e.printStackTrace();
                        //speak("invalid data from server");
                    }
                }

                @Override
                public void onErrorResponse(VolleyError error) {
                    error.printStackTrace();
                    //speak("not able to access the server");
                }
            });
        }
    }

    @Override
    protected void onResume() {

        super.onResume();

        prepareScreen();
    }

    private void prepareScreen() {
        setLocale(LocalValuesHelper.getInstance().getLanguage());

        binding.setBtnLanguage(getString(R.string.btnLanguage));
        binding.setBtnForOthers(getString(R.string.btnForOthers));
        binding.setBtnForMe(getString(R.string.btnForMe));
    }

    private View.OnClickListener btnLanguageClicked = new View.OnClickListener() {
        @Override
        public void onClick(View view){
            goToLanguages();
        }
    };

    private View.OnClickListener btnForOthersClicked = new View.OnClickListener() {
        @Override
        public void onClick(View view){
            goToForOthers();
        }
    };

    private View.OnClickListener btnForMeClicked = new View.OnClickListener() {
        @Override
        public void onClick(View view){
            goToForMe();
        }
    };

    private void goToLanguages() {
        Intent intent = new Intent(this, LanguagesActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.activity_in, R.anim.activity_out);
    }

    private void goToForOthers() {
        Intent intent = new Intent(this, ForOthersActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.activity_in, R.anim.activity_out);
    }

    private void goToForMe() {
        Intent intent = new Intent(this, LanguagesActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.activity_in, R.anim.activity_out);
    }
}
