package com.datarake.prayers4me.activities;

import android.databinding.DataBindingUtil;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;

import com.datarake.prayers4me.R;
import com.datarake.prayers4me.adapters.LanguageAdapter;
import com.datarake.prayers4me.databinding.ActivityLanguagesBinding;
import com.datarake.prayers4me.helpers.LocalValuesHelper;
import com.datarake.prayers4me.models.LanguageModel;

import java.util.ArrayList;

/**
 * Created by bogdan on 21/01/2018.
 */

public class LanguagesActivity extends BaseActivity {

    ActivityLanguagesBinding binding;
    ArrayList<LanguageModel> languages;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_languages);

        binding = DataBindingUtil.setContentView(this, R.layout.activity_languages);
        binding.setTitle(getString(R.string.lblLanguagesTitle));

        languages = new ArrayList<LanguageModel>();
        languages.add(new LanguageModel("en", "Prayers in English"));
        languages.add(new LanguageModel("es", "Oraciones en español"));
        languages.add(new LanguageModel("fr", "Prières en français"));
        languages.add(new LanguageModel("ro", "Rugăciuni în română"));
        languages.add(new LanguageModel("ru", "Молитвы на русском языке"));

        LanguageAdapter languageAdapter = new LanguageAdapter(this, languages);
        binding.languagesList.setAdapter(languageAdapter);

        binding.languagesList.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {

                LanguageModel selection = (LanguageModel) parent.getItemAtPosition(position);
                LocalValuesHelper.getInstance().setLanguage(selection.code);

                onBackPressed();

                overridePendingTransition(R.anim.activity_back_in, R.anim.activity_back_out);

            }
        });
    }
}
