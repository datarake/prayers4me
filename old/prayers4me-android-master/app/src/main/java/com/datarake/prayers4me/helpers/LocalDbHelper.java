package com.datarake.prayers4me.helpers;

import android.content.Context;

import com.datarake.prayers4me.models.PrayerModel;

import java.util.Arrays;
import java.util.Map;

import io.realm.Realm;
import io.realm.RealmQuery;
import io.realm.RealmResults;
import io.realm.Sort;

/**
 * Created by bogdan on 29/01/2018.
 */

public class LocalDbHelper {
    private static final LocalDbHelper ourInstance = new LocalDbHelper();
    private Context appContext;

    public static LocalDbHelper getInstance() {
        return ourInstance;
    }

    private LocalDbHelper() {
    }

    public void init(Context context){
        if(appContext == null){
            appContext = context;
            Realm.init(appContext);
        }
    }


    public boolean isFirstPrayer(){
        Realm realm = Realm.getDefaultInstance();

        RealmQuery<PrayerModel> query = realm.where(PrayerModel.class);
        query.equalTo("isMine", true);
        query.and().equalTo("language", LocalValuesHelper.getInstance().getLanguage());

        RealmResults<PrayerModel> result = query.findAll();

        return (result.size() == 0);
    }

    public void insertPrayer(Map<String, Object> data, boolean isMine) {
        Realm realm = Realm.getDefaultInstance();

        PrayerModel prayer = realm.createObject(PrayerModel.class);

        prayer.setId((int)data.get("id"));
        prayer.setLanguage(data.get("language").toString());
        prayer.setName(data.get("name").toString());
        prayer.setIsContactable((boolean)data.get("isContactable"));
        prayer.setPhone(data.get("phone").toString());
        prayer.setEmail(data.get("email").toString());
        prayer.setMessage(data.get("message").toString());
        prayer.setPrayersCount((int)data.get("prayersCount"));
        prayer.setIsPrayedByMe((boolean)data.get("isPrayedByMe"));
        prayer.setMine(isMine);

        realm.beginTransaction();
        realm.insert(prayer);
        realm.commitTransaction();
    }

    public RealmResults<PrayerModel> getPrayersForMe() {
        Realm realm = Realm.getDefaultInstance();

        RealmQuery<PrayerModel> query = realm.where(PrayerModel.class);
        query.equalTo("isMine", true);
        query.and().equalTo("language", LocalValuesHelper.getInstance().getLanguage());

        RealmResults<PrayerModel> result = query.findAll();
        result = result.sort("id", Sort.DESCENDING);

        return result;
    }

    public RealmResults<PrayerModel>getPrayersForOthers() {
        Realm realm = Realm.getDefaultInstance();

        RealmQuery<PrayerModel> query = realm.where(PrayerModel.class);
        query.equalTo("isMine", false);
        query.and().equalTo("language", LocalValuesHelper.getInstance().getLanguage());

        RealmResults<PrayerModel> result = query.findAll();
        result = result.sort("id", Sort.DESCENDING);

        return result;
    }

    public void syncPrayersForMe(Arrays data) {

    }

    public void removePrayersForOthers(){
        Realm realm = Realm.getDefaultInstance();

        RealmQuery<PrayerModel> query = realm.where(PrayerModel.class);
        query.equalTo("isMine", false);
        query.and().equalTo("language", LocalValuesHelper.getInstance().getLanguage());

        RealmResults<PrayerModel> prayers = query.findAll();

        realm.beginTransaction();
        prayers.deleteAllFromRealm();
        realm.commitTransaction();
    }

    public void updatePrayer(PrayerModel prayer, int prayersCount) {
        Realm realm = Realm.getDefaultInstance();

        realm.beginTransaction();

        prayer.setPrayersCount(prayersCount);
        prayer.setIsPrayedByMe(true);

        realm.commitTransaction();
    }

}
