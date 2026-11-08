package com.datarake.prayers4me.models;

import com.datarake.prayers4me.helpers.LocalValuesHelper;

import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;

import io.realm.RealmObject;
import io.realm.annotations.Ignore;
import io.realm.annotations.PrimaryKey;

/**
 * Created by bogdan on 29/01/2018.
 */

public class PrayerModel extends RealmObject {

    @PrimaryKey
    private int id;

    private String language;
    private String name;
    private boolean isContactable;
    private String phone;
    private String email;
    private String message;
    private int prayersCount;
    private Date createdAt;
    private boolean isMine;
    private boolean isPrayedByMe;


    public void setId(int id) {
        this.id = id;
    }

    public int getId() {
        return id;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isContactable() {
        return isContactable;
    }

    public void setIsContactable(boolean isContactable) {
        this.isContactable = isContactable;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getPrayersCount() {
        return prayersCount;
    }

    public void setPrayersCount(int prayersCount) {
        this.prayersCount = prayersCount;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isMine() {
        return isMine;
    }

    public void setMine(boolean mine) {
        isMine = mine;
    }

    public boolean isPrayedByMe() {
        return isPrayedByMe;
    }

    public void setIsPrayedByMe(boolean isPrayedByMe) {
        this.isPrayedByMe = isPrayedByMe;
    }

    public String getPrayersInfo() {
        if(prayersCount == 0) {
            return "lblPrayersNone";
        } else if(prayersCount == 1) {
            return "lblPrayersOne";
        } else return "lblPrayersMultiple";
    }

    public String getDateInfo() {

        String language = LocalValuesHelper.getInstance().getLanguage();
        Locale locale = Locale.US;
        switch(language) {
            case "es":
            case "ro":
            case "ru":
                locale = Locale.US;
                break;
            case "fr":
                locale = Locale.FRANCE;
                break;
        }

        int style = DateFormat.MEDIUM;
        DateFormat df = DateFormat.getDateInstance(style, locale);

        return df.format(createdAt);
    }



}