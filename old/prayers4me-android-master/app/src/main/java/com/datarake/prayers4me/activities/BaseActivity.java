package com.datarake.prayers4me.activities;

import android.content.res.Configuration;
import android.content.res.Resources;
import android.support.v7.app.AppCompatActivity;
import android.util.DisplayMetrics;

import java.util.Locale;
import com.datarake.prayers4me.helpers.LocalValuesHelper;

/**
 * Created by bogdan on 20/01/2018.
 */

public class BaseActivity extends AppCompatActivity {

    public void setLocale(String lang) { //call this in onCreate()
        Locale myLocale = new Locale(lang);
        Resources res = getResources();
        DisplayMetrics dm = res.getDisplayMetrics();
        Configuration conf = res.getConfiguration();
        conf.locale = myLocale;
        res.updateConfiguration(conf, dm);
    }
}

