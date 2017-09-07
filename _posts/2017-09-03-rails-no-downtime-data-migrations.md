---
layout: post
title: "Rails: No downtime data migrations"
date: 2017-03-11 13:05:11 -0400
---
<img src="/images/jetski.jpg" alt="jetski flip" title="Rails: No down time data migrations" class="banner-img" />
<!-- TOC -->

- [Introduction](#introduction)
- [Deploy 1: Add columns and tables](#deploy-1-add-columns-and-tables)
  - [Create a rails migration to add the columns and tables](#create-a-rails-migration-to-add-the-columns-and-tables)
  - [Write a rake task to update the new column](#write-a-rake-task-to-update-the-new-column)
  - [Sync the new column with the old with a Concern](#sync-the-new-column-with-the-old-with-a-concern)
- [Deploy 2: Make the backwards compatible changes](#deploy-2-make-the-backwards-compatible-changes)
- [Deploy 3: Rename the unused columns and tables](#deploy-3-rename-the-unused-columns-and-tables)
- [Done: Delete the `*_delete_me` columns and tables](#done-delete-the-_delete_me-columns-and-tables)

<!-- /TOC -->
# Introduction

It is 2017 and shockingly, many rails apps require downtime for a successful deploy.  I am looking at you, [Gitlab](https://docs.gitlab.com/ee/development/migration_style_guide.html#downtime-tagging).

Data migrations are a huge (and unnecessary!) cause for bringing down a rails app. For a new feature, the code may depend on the database and date within it be configured in a certain way.  

Apply this pattern when you:
  - add a new column when denormalizing a table
  - completely replacing one model (relationships and all) with another model.
  - adding a new gem

To accomplish 0 down time, I will walk you through how to do this by example via implementing the `ancestry` gem.  Their [suggested migration guide](https://github.com/stefankroes/ancestry#migrating-from-plugin-that-uses-parent_id-column) to move from a `parent_id` to their `ancestry` column offers some clues how to perform the migration, but I will emphasize key steps missing from the guide

# Deploy 1: Add columns and tables

## Create a rails migration to add the columns and tables
The first deployment needs to add columns to your production database.  Supporting these extra columns will be simple.  You may need to double check your queries for naming collisions if other tables you join on have the same column name.

```
   add_column :users, :ancestry, :string
```

If the new column name exists on a table that was joined with your table, SQL will complain about not knowing which column to use.

## Write a rake task to update the new column
With our example of ancestry, we also add the gem since that will not effect our existing code structure.  This gives us the benefit of using their data migration method `build_ancestry_from_parent_ids!` for building the ancestry tree.

Keep in mind, all of our "active" code should still be using the original `parent_id` method.  Nothing should change about that.

## Sync the new column with the old with a Concern
If you are migrating data from one column to another column, you can use ruby overrides and rails concerns to write to both the new column and the old column without impacting your business logic.

```
module SyncParentId
  extend ActiveSupport::Concern

  included do
    before_save :update_ancestry_id, if: 'parent_obj_id_changed?'
  end

  def update_ancestry_id
    # call the ancestry method to update the `ancestry` column
    self.parent = parent_obj
  end
end

```

After this deploy, your code will use `parent_id` as it was before, but now we have a 100% up-to-date `ancestry` column that is fully populated and ready to go.  

# Deploy 2: Make the backwards compatible changes
Now it will be safe to migrate off of `parent_id` to `ancestry`.  Our production database has a fully populated `ancestry` column that is perfectly in sync with the old `parent_id`.  You can now safely migrate from `parent_id` to `ancestry` without any problems.

If you are extremely cautious and want to defend against a bad deployment and a rollback, you can add a similar syncing method to the new code to maintain the `parent_id` code as the `ancestry` column changes.  If you need to revert the changes, all data will still be in sync and the old version of the app will still be able to use `parent_id` with no data loss.

# Deploy 3: Rename the unused columns and tables

Rename the columns to `*_delete_me` or something to prove that your code is no longer using now unused columns and tables.  We don't want to loose any data and if we find that these tables or columns are actually still in use, we can easily rename them back to their previous names until we go back to step 2 and redeploy code that does not use them.

# Done: Delete the `*_delete_me` columns and tables

Once you are 100% confident that you no longer need the old columns and tables, you can now create rails migrations to permanently remove these from your system.  Some companies may actually do these outside of rails migrations, because they do not allow the `deploy` user to destructively modify the database to prevent any accidental table drops.

