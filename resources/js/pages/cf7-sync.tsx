import { Form, Head, router } from '@inertiajs/react';
import React from 'react';
import { RefreshCw } from 'lucide-react';
import ApiSettingController from '@/actions/App/Http/Controllers/Settings/ApiSettingController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, sync } from '@/routes/cf7-sync';

type Props = {
    cf7ApiUrl: string | null;
    cf7ApiUsername: string | null;
    hasPassword: boolean;
};

export default function Cf7Sync({ cf7ApiUrl, cf7ApiUsername, hasPassword }: Props) {
    const [syncing, setSyncing] = React.useState(false);

    function runSync() {
        setSyncing(true);
        router.post(sync(), {}, {
            onFinish: () => setSyncing(false),
        });
    }

    return (
        <>
            <Head title="CF7 Sync" />

            <div className="px-4 py-6">
                <div className="flex items-start justify-between mb-6">
                    <Heading
                        title="CF7 Sync"
                        description="Configure the Contact Form 7 API and sync enquiries"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        disabled={syncing}
                        onClick={runSync}
                    >
                        <RefreshCw className={syncing ? 'mr-2 animate-spin' : 'mr-2'} />
                        {syncing ? 'Syncing…' : 'Run Sync Now'}
                    </Button>
                </div>

                <Form
                    {...ApiSettingController.update.form()}
                    options={{ preserveScroll: true }}
                    className="max-w-xl space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="cf7_api_url">API URL</Label>
                                <Input
                                    id="cf7_api_url"
                                    name="cf7_api_url"
                                    type="url"
                                    defaultValue={cf7ApiUrl ?? ''}
                                    placeholder="https://example.com/wp-json/custom/v1/cfdb7-submissions"
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.cf7_api_url} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cf7_api_username">Username</Label>
                                <Input
                                    id="cf7_api_username"
                                    name="cf7_api_username"
                                    defaultValue={cf7ApiUsername ?? ''}
                                    autoComplete="off"
                                    placeholder="API username"
                                    className="mt-1 block w-full"
                                />
                                <InputError message={errors.cf7_api_username} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cf7_api_password">Password</Label>
                                <PasswordInput
                                    id="cf7_api_password"
                                    name="cf7_api_password"
                                    autoComplete="new-password"
                                    placeholder={hasPassword ? '••••••••' : 'API password'}
                                    className="mt-1 block w-full"
                                />
                                {hasPassword && (
                                    <p className="text-sm text-muted-foreground">
                                        Leave blank to keep the current password.
                                    </p>
                                )}
                                <InputError message={errors.cf7_api_password} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>Save</Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Cf7Sync.layout = {
    breadcrumbs: [
        {
            title: 'CF7 Sync',
            href: edit(),
        },
    ],
};
