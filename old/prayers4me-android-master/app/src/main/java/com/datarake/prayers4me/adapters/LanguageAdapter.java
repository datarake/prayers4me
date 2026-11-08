package com.datarake.prayers4me.adapters;

import android.app.Activity;
import android.content.Context;
import android.databinding.DataBindingUtil;
import android.support.v4.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.BaseAdapter;
import android.widget.TextView;

import com.datarake.prayers4me.R;
import com.datarake.prayers4me.databinding.CellLanguageBinding;
import com.datarake.prayers4me.helpers.LocalValuesHelper;
import com.datarake.prayers4me.models.LanguageModel;

import java.util.ArrayList;

/**
 * Created by bogdan on 23/01/2018.
 */

public class LanguageAdapter extends ArrayAdapter<LanguageModel> {

    Context context;
    ArrayList<LanguageModel> languages;
    private static LayoutInflater inflater = null;

    public LanguageAdapter(Context context, ArrayList<LanguageModel> languages) {
        super(context, 0, languages);

        this.context = context;
        this.languages = languages;
    }

    @Override
    public int getCount() {
        return languages.size();
    }

    @Override
    public LanguageModel getItem(int position) {
        return languages.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public View getView(int position, View convertView, ViewGroup parent) {

        if (inflater == null) {
            inflater = (LayoutInflater) parent.getContext()
                    .getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        }

        CellLanguageBinding binding = DataBindingUtil.getBinding(convertView);

        if (convertView == null) {
            binding = DataBindingUtil.inflate(inflater, R.layout.cell_language, parent, false);
        } else {
            binding = DataBindingUtil.getBinding(convertView);
        }
        binding.executePendingBindings();

        LanguageModel language = languages.get(position);
        if(language.code.equals(LocalValuesHelper.getInstance().getLanguage())) {
            binding.imgUncheck.setVisibility(View.GONE);
            binding.imgCheck.setVisibility(View.VISIBLE);
            binding.txt.setTextColor(ContextCompat.getColor(context, R.color.textDarkColor));
        } else {
            binding.imgUncheck.setVisibility(View.VISIBLE);
            binding.imgCheck.setVisibility(View.GONE);
            binding.txt.setTextColor(ContextCompat.getColor(context, R.color.textLightColor));
        }
        binding.setLanguage(language);

        return binding.getRoot();
    }
}
