package com.datarake.prayers4me.helpers;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Created by bogdan on 21/01/2018.
 */

public class LocalValuesHelper {

    private static final String LANGUAGE_KEY = "language";
    private static final String TOKEN_KEY = "token";
    private static final String NAME_KEY = "name";
    private static final String IS_CONTACTABLE_KEY = "isContactable";
    private static final String PHONE_KEY = "phone";
    private static final String EMAIL_KEY = "email";
    private static final String SYNC_AT_KEY = "syncAt";

    private static final LocalValuesHelper ourInstance = new LocalValuesHelper();
    private Context appContext;

    public static LocalValuesHelper getInstance() {
        return ourInstance;
    }

    private LocalValuesHelper() {
    }

    public void init(Context context){
        if(appContext == null){
            appContext = context;
        }
    }

    public boolean isFirstTime() {
        return false;
    }

    public void setLanguage(String language) {
        setString(language, LANGUAGE_KEY);
    }
    public String getLanguage() {
        return getString(LANGUAGE_KEY, "en");
    }

    public void setToken(String token) {
        setString(token, TOKEN_KEY);
    }
    public String getToken() {
        return getString(TOKEN_KEY, "");
    }

    public void setName(String name) {
        setString(name, NAME_KEY);
    }
    public String getName() {
        return getString(NAME_KEY, "");
    }

    public void setIsContactable(boolean isContactable) {
        setBoolean(isContactable, IS_CONTACTABLE_KEY);
    }
    public boolean getIsContactable() {
        return getBoolean(IS_CONTACTABLE_KEY, true);
    }

    public void setPhone(String phone) {
        setString(phone, PHONE_KEY);
    }
    public String getPhone() {
        return getString(PHONE_KEY, "");
    }

    public void setEmail(String email) {
        setString(email, EMAIL_KEY);
    }
    public String getEmail() {
        return getString(EMAIL_KEY, "");
    }

    public void setSyncAt(String syncAt) {
        setString(syncAt, SYNC_AT_KEY);
    }
    public String getSyncAt() {
        return getString(SYNC_AT_KEY, "");
    }

    private void setString(String value, String key) {
        SharedPreferences sharedPref;
        SharedPreferences.Editor editor;

        sharedPref = appContext.getSharedPreferences("myPref", Context.MODE_PRIVATE);
        editor = sharedPref.edit();

        editor.putString(key, value);
        editor.apply();
    }
    private String getString(String key, String defaultValue) {
        SharedPreferences sharedPref;
        sharedPref = appContext.getSharedPreferences("myPref", Context.MODE_PRIVATE);

        return sharedPref.getString(key, defaultValue);
    }

    private void setBoolean(boolean value, String key) {

    }
    private boolean getBoolean(String key, boolean defaultValue) {
        return true;
    }
}
