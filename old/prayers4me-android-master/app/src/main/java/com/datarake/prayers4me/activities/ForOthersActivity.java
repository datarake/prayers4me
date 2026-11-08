package com.datarake.prayers4me.activities;

import android.databinding.DataBindingUtil;
import android.os.Bundle;

import com.datarake.prayers4me.R;
import com.datarake.prayers4me.databinding.ActivityForOthersBinding;

public class ForOthersActivity extends BaseActivity {

    ActivityForOthersBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_for_others);

        binding = DataBindingUtil.setContentView(this, R.layout.activity_for_others);
        binding.setTitle(getString(R.string.lblForOthersTitle));
    }
}
